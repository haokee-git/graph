import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, FormControlLabel, Checkbox, TextField, Link, Button, Alert, IconButton, Card, CardContent, Tooltip } from '@mui/material';
import Editor, { OnMount } from '@monaco-editor/react';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { Renderer } from './engine/Renderer';
import { GraphParser, ParserError } from './GraphParser';
import { Node } from './engine/types';
import type * as Monaco from 'monaco-editor';
import packageJson from '../package.json'; // Import package.json for version

// Simple SVG Icons
const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"></path>
    <path d="M1 20v-6h6"></path>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const ZoomInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// 新增图标
const DirectedGraphIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="3"></circle>
    <circle cx="19" cy="12" r="3"></circle>
    <path d="M8 12h8"></path>
    <path d="M16 9l3 3-3 3"></path>
  </svg>
);

const NodeCountIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="9" r="2"></circle>
    <circle cx="15" cy="9" r="2"></circle>
    <circle cx="9" cy="15" r="2"></circle>
    <circle cx="15" cy="15" r="2"></circle>
  </svg>
);

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const HelpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

function App() {
  const [isDirected, setIsDirected] = useState(true);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1) {
      setIsElectron(true);
    }
  }, []);
  const [isFixedCount, setIsFixedCount] = useState(false);
  const [fixedNodeCount, setFixedNodeCount] = useState<number>(10);
  const [editorCode, setEditorCode] = useState<string>('');
  const [errors, setErrors] = useState<ParserError[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine>(new PhysicsEngine());
  const rendererRef = useRef<Renderer | null>(null);
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const draggingNodeRef = useRef<Node | null>(null);
  
  // 缩放动画相关状态
  const [targetScale, setTargetScale] = useState(1.0);
  const scaleAnimationRef = useRef<number | null>(null);

  // 平滑缩放动画
  useEffect(() => {
    if (!rendererRef.current) return;
    
    const animateScale = () => {
      if (!rendererRef.current) return;
      
      const currentScale = rendererRef.current.scale;
      const diff = targetScale - currentScale;
      
      if (Math.abs(diff) > 0.001) {
        // 使用缓动函数 (ease-out)
        rendererRef.current.scale += diff * 0.15;
        scaleAnimationRef.current = requestAnimationFrame(animateScale);
      } else {
        rendererRef.current.scale = targetScale;
        scaleAnimationRef.current = null;
      }
    };
    
    if (scaleAnimationRef.current) {
      cancelAnimationFrame(scaleAnimationRef.current);
    }
    
    scaleAnimationRef.current = requestAnimationFrame(animateScale);
    
    return () => {
      if (scaleAnimationRef.current) {
        cancelAnimationFrame(scaleAnimationRef.current);
      }
    };
  }, [targetScale]);

  // Initialize Renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new Renderer(
        canvasRef.current.getContext('2d')!, 
        engineRef.current
      );
    }
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && rendererRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        rendererRef.current.setSize(clientWidth, clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation Loop
  const animate = useCallback(() => {
    if (rendererRef.current) {
      engineRef.current.update();
      rendererRef.current.draw(isDirected);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isDirected]); // isDirected needed for drawing arrows

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  // Update Graph from Input
  useEffect(() => {
    if (rendererRef.current) {
      engineRef.current.reconfigureEdges();

      const result = GraphParser.parse(
        editorCode, 
        isFixedCount, 
        fixedNodeCount, 
        engineRef.current,
        rendererRef.current.width,
        rendererRef.current.height
      );

      setErrors(result.errors);

      // Update Editor Decorations - 支持警告和错误两种级别
      if (editorRef.current && (window as any).monaco) {
        const monaco = (window as any).monaco;
        const newDecorations: Monaco.editor.IModelDeltaDecoration[] = result.errors.map(err => ({
          range: new monaco.Range(err.line, 1, err.line, 1),
          options: {
            isWholeLine: true,
            className: err.severity === 'error' ? 'errorLineDecoration' : 'warningLineDecoration',
            inlineClassName: err.severity === 'error' ? 'errorLineText' : 'warningLineText'
          }
        }));
        
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current, 
          newDecorations
        );
      }
    }
  }, [editorCode, isFixedCount, fixedNodeCount]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    (window as any).monaco = monaco; // Hack to access Range in useEffect
    
    // Define theme with error highlight style if needed, 
    // but className in decoration is enough for basic styling via global CSS
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !rendererRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Transform screen coordinates to world coordinates
    const { width, height, scale, offsetX, offsetY } = rendererRef.current;
    
    // 渲染器的正向变换（世界 -> 屏幕）：
    // 1. translate(offsetX, offsetY)
    // 2. translate(-centerX, -centerY)
    // 3. scale(scale, scale)
    // 4. translate(centerX, centerY)
    // 
    // 正向公式：
    // sx = (wx + offsetX - centerX) * scale + centerX
    // sy = (wy + offsetY - centerY) * scale + centerY
    //
    // 逆向公式（屏幕 -> 世界）：
    // wx = (sx - centerX) / scale + centerX - offsetX
    // wy = (sy - centerY) / scale + centerY - offsetY
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clientX - centerX) / scale + centerX - offsetX;
    const worldY = (clientY - centerY) / scale + centerY - offsetY;

    // Check collision with nodes
    let clickedNode = null;
    for (const node of engineRef.current.nodes.values()) {
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      draggingNodeRef.current = clickedNode;
      clickedNode.isFixed = true;
      clickedNode.vx = 0;
      clickedNode.vy = 0;
    } else {
      // Start Panning
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !rendererRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Transform to world coordinates for dragging/hover
    const { width, height, scale, offsetX, offsetY } = rendererRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clientX - centerX) / scale + centerX - offsetX;
    const worldY = (clientY - centerY) / scale + centerY - offsetY;

    // Handle Node Dragging
    if (draggingNodeRef.current) {
      draggingNodeRef.current.x = worldX;
      draggingNodeRef.current.y = worldY;
      draggingNodeRef.current.vx = 0;
      draggingNodeRef.current.vy = 0;
      return; // Skip hover/pan if dragging
    }

    // Handle Panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      rendererRef.current.offsetX += dx;
      rendererRef.current.offsetY += dy;
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle Hover Highlighting
    let hoveredNode = null;
    for (const node of engineRef.current.nodes.values()) {
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        hoveredNode = node;
        break;
      }
    }
    rendererRef.current.hoveredNodeId = hoveredNode ? hoveredNode.id : null;
  };

  const handleMouseUp = () => {
    if (draggingNodeRef.current) {
      draggingNodeRef.current.isFixed = false;
      draggingNodeRef.current = null;
    }
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, targetScale * delta));
    setTargetScale(newScale);
  };

  // 缩放按钮处理函数 - 使用平滑动画
  const handleZoomIn = () => {
    const newScale = Math.min(5, targetScale * 1.2);
    setTargetScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, targetScale / 1.2);
    setTargetScale(newScale);
  };

  // Refresh/Reload Graph
  const handleRefresh = () => {
    if (rendererRef.current) {
      engineRef.current.clear();
      engineRef.current.reconfigureEdges();
      const result = GraphParser.parse(
        editorCode, 
        isFixedCount, 
        fixedNodeCount, 
        engineRef.current,
        rendererRef.current.width,
        rendererRef.current.height
      );
      setErrors(result.errors);
    }
  };

  // Layout Constants
  const leftPanelWidth = 350;

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Left Panel: Input */}
      <Paper 
        elevation={3} 
        sx={{ 
          width: leftPanelWidth, 
          display: 'flex', 
          flexDirection: 'column', 
          p: 3,
          zIndex: 10,
          borderRadius: 0,
          boxSizing: 'border-box',
          background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)'
        }}
      >
        {/* 标题区域 */}
        <Box sx={{ mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontFamily: 'BodyFont', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              渴鹅图论
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#667eea', 
                fontWeight: 'bold',
                bgcolor: 'rgba(102, 126, 234, 0.1)',
                px: 0.8,
                py: 0.2,
                borderRadius: 1
              }}
            >
              v{packageJson.version}
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            Haokee Graph
          </Typography>
        </Box>
        
        {/* 图类型选择 */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <DirectedGraphIcon />
            <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 'bold' }}>
              图类型
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Checkbox 
                size="small" 
                checked={isDirected} 
                onChange={(e) => setIsDirected(e.target.checked)}
                sx={{
                  '&.Mui-checked': {
                    color: '#667eea'
                  }
                }}
              />
            }
            label={<Typography variant="body2">有向图（显示箭头）</Typography>}
          />
        </Box>
        
        {/* 节点设置 */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <NodeCountIcon />
            <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 'bold' }}>
              节点设置
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Checkbox 
                size="small" 
                checked={isFixedCount} 
                onChange={(e) => setIsFixedCount(e.target.checked)}
                sx={{
                  '&.Mui-checked': {
                    color: '#667eea'
                  }
                }}
              />
            }
            label={<Typography variant="body2">固定节点数量</Typography>}
          />
          {isFixedCount && (
            <TextField
              type="number"
              size="small"
              value={fixedNodeCount}
              onChange={(e) => setFixedNodeCount(Math.max(1, Number(e.target.value)))}
              sx={{ 
                width: '100%', 
                mt: 1,
                bgcolor: '#fff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#bdbdbd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                    borderWidth: '1px'
                  }
                },
                '& input': {
                  py: 1,
                  px: 1.5,
                  fontSize: '0.9rem'
                }
              }}
              inputProps={{ min: 1 }}
              placeholder="输入节点数量"
            />
          )}
        </Box>

        {/* 刷新按钮 */}
        <Button 
          variant="contained" 
          onClick={handleRefresh} 
          fullWidth
          startIcon={<RefreshIcon />}
          sx={{ 
            mb: 2,
            py: 1.2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', 
            textTransform: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a4093 100%)',
              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
            }
          }}
        >
          刷新 / 重绘
        </Button>

        {/* 编辑器区域 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CodeIcon />
            <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 'bold' }}>
              边列表
            </Typography>
            <Tooltip 
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>输入格式说明</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.1)', p: 0.5, borderRadius: 0.5, mb: 1 }}>
                    a b [c]
                  </Typography>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    <li><Typography variant="caption">a: 起点编号</Typography></li>
                    <li><Typography variant="caption">b: 终点编号</Typography></li>
                    <li><Typography variant="caption">c: 边权重/标签 (可选)</Typography></li>
                  </ul>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#aaa', fontStyle: 'italic' }}>
                    * 编号可为任意字符
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#aaa' }}>
                    示例: 1 2 connects
                  </Typography>
                </Box>
              }
              placement="right"
              arrow
            >
              <IconButton size="small" sx={{ ml: 1, color: '#999', '&:hover': { color: '#667eea' } }}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box 
            sx={{ 
              flex: 1, 
              border: '2px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
              '&:focus-within': {
                borderColor: '#667eea',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), 0 0 0 3px rgba(102, 126, 234, 0.1)'
              }
            }}
          >
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={editorCode}
              onChange={(value) => setEditorCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Right Panel: Display Area */}
      <Box 
        ref={containerRef}
        sx={{ flex: 1, position: 'relative', bgcolor: '#f5f5f5', overflow: 'hidden' }}
      >
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: draggingNodeRef.current ? 'grabbing' : 'default' }}
        />
        
        {/* 缩放按钮 - 右下角 */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1,
          zIndex: 100
        }}>
          <IconButton 
            onClick={handleZoomIn}
            sx={{ 
              bgcolor: 'white', 
              boxShadow: 2,
              '&:hover': { bgcolor: '#f0f0f0' }
            }}
          >
            <ZoomInIcon />
          </IconButton>
          <IconButton 
            onClick={handleZoomOut}
            sx={{ 
              bgcolor: 'white', 
              boxShadow: 2,
              '&:hover': { bgcolor: '#f0f0f0' }
            }}
          >
            <ZoomOutIcon />
          </IconButton>
        </Box>

        {/* GitHub 卡片 - 右上角 */}
        <Box sx={{
          position: 'absolute', 
          top: 20, 
          right: 20,
          display: 'flex',
          gap: 2,
          zIndex: 100
        }}>
          {/* 下载卡片 - 仅在非 Electron 环境显示 */}
          {!isElectron && (
            <Card sx={{ 
              minWidth: 160,
              boxShadow: 3,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => window.open('/download', '_blank')}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: '#667eea' }}>
                    <DownloadIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      下载桌面版
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Windows Installer
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card sx={{ 
            minWidth: 200,
            maxWidth: 250,
            boxShadow: 3,
            borderRadius: 2
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Link 
                href="https://github.com/haokee-git/graph/" 
                target="_blank" 
                rel="noopener"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  textDecoration: 'none',
                  color: '#333',
                  '&:hover': { color: '#2196f3' }
                }}
              >
                <GithubIcon />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    GitHub 仓库
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    haokee-git/graph
                  </Typography>
                </Box>
              </Link>
            </CardContent>
          </Card>
        </Box>

        {/* 信息展示 - 中央底部 */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          left: '50%', 
          transform: 'translateX(-50%)',
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2,
          boxShadow: 3,
          p: 2,
          maxWidth: 600,
          zIndex: 100
        }}>
          <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <strong>作者：</strong>
            <span style={{ color: '#666' }}>Haokee, Claude Opus 4.5, Gemini 3 Pro</span>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
            <strong>简介：</strong>基于 TypeScript 的图论可视化工具，采用自研物理引擎模拟节点间斥力与边的弹力。
            <br />
            <strong>操作：</strong>左侧输入边（格式：<code>a b c</code>），右侧实时渲染。
            拖拽节点移动位置，拖拽空白区域平移画布，滚轮或右下角按钮缩放视图。
            悬停节点可高亮其连接的边。
          </Typography>
        </Box>
        
        {/* 错误/警告提示 - 顶部 */}
        {errors.length > 0 && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 10,
            p: 1, 
            maxHeight: 150, 
            overflowY: 'auto',
            bgcolor: 'rgba(255, 255, 255, 0.95)'
          }}>
            {errors.map((err, i) => (
              <Alert 
                severity={err.severity === 'error' ? 'error' : 'warning'} 
                key={i} 
                sx={{ mb: 0.5, py: 0 }}
              >
                行 {err.line}: {err.message}
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
