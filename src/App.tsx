import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, FormControlLabel, Checkbox, TextField, Link, Button, Alert } from '@mui/material';
import Editor, { OnMount } from '@monaco-editor/react';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { Renderer } from './engine/Renderer';
import { GraphParser, ParserError } from './GraphParser';
import { Node } from './engine/types';
import type * as Monaco from 'monaco-editor';

// Simple SVG Refresh Icon
const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"></path>
    <path d="M1 20v-6h6"></path>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

function App() {
  const [isDirected, setIsDirected] = useState(true);
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

      // Update Editor Decorations
      if (editorRef.current && (window as any).monaco) {
        const monaco = (window as any).monaco;
        const newDecorations: Monaco.editor.IModelDeltaDecoration[] = result.errors.map(err => ({
          range: new monaco.Range(err.line, 1, err.line, 1),
          options: {
            isWholeLine: true,
            className: 'errorLineDecoration',
            inlineClassName: 'errorLineText'
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
    
    // Reverse transform: 
    // The renderer uses: 
    // 1. translate(width/2, height/2)
    // 2. scale(scale, scale)
    // 3. translate(-width/2, -height/2)
    // 4. translate(offsetX, offsetY)
    
    // So to get back to world space from screen space (clientX/Y inside canvas):
    // 1. Undo translate(offsetX, offsetY)
    // 2. Undo translate(-width/2, -height/2) -> which is translate(width/2, height/2)
    // 3. Undo scale(scale, scale) -> scale(1/scale, 1/scale)
    // 4. Undo translate(width/2, height/2) -> translate(-width/2, -height/2)
    
    // Let's do it step by step:
    // P_screen = ((P_world - Center) * Scale + Center) + Offset
    // P_screen - Offset = (P_world - Center) * Scale + Center
    // P_screen - Offset - Center = (P_world - Center) * Scale
    // (P_screen - Offset - Center) / Scale = P_world - Center
    // P_world = (P_screen - Offset - Center) / Scale + Center
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clientX - offsetX - centerX) / scale + centerX;
    const worldY = (clientY - offsetY - centerY) / scale + centerY;

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
    const worldX = (clientX - offsetX - centerX) / scale + centerX;
    const worldY = (clientY - offsetY - centerY) / scale + centerY;

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
    if (rendererRef.current) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      rendererRef.current.scale *= delta;
      // Clamp scale
      rendererRef.current.scale = Math.max(0.1, Math.min(5, rendererRef.current.scale));
    }
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
  const bottomPanelHeight = 120;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Panel: Input */}
        <Paper 
          elevation={3} 
          sx={{ 
            width: leftPanelWidth, 
            display: 'flex', 
            flexDirection: 'column', 
            p: 2,
            zIndex: 10,
            borderRadius: 0,
            boxSizing: 'border-box'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontFamily: 'BodyFont', fontWeight: 'bold' }}>
            图论可视化
          </Typography>
          
          <FormControlLabel
            control={<Checkbox size="small" checked={isDirected} onChange={(e) => setIsDirected(e.target.checked)} />}
            label={<Typography variant="body2">有向图</Typography>}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={isFixedCount} onChange={(e) => setIsFixedCount(e.target.checked)} />}
              label={<Typography variant="body2">固定点数</Typography>}
            />
            {isFixedCount && (
              <TextField
                type="number"
                size="small"
                value={fixedNodeCount}
                onChange={(e) => setFixedNodeCount(Math.max(1, Number(e.target.value)))}
                sx={{ width: 80, ml: 1 }}
                inputProps={{ min: 1 }}
              />
            )}
          </Box>

          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              onClick={handleRefresh} 
              fullWidth
              startIcon={<RefreshIcon />}
              sx={{ color: 'white', textTransform: 'none' }}
            >
              刷新 / 重绘
            </Button>
          </Box>

          <Typography variant="subtitle2" gutterBottom>边列表 (a b c)</Typography>
          <Box sx={{ flex: 1, border: '1px solid #ccc' }}>
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
        </Paper>

        {/* Right Panel: Display */}
        <Box 
          ref={containerRef}
          sx={{ flex: 1, position: 'relative', bgcolor: '#f5f5f5', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ flex: 1, position: 'relative' }}>
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ display: 'block', cursor: draggingNodeRef.current ? 'grabbing' : 'default' }}
            />
          </Box>
          
          {/* Error Display - Absolutely positioned to ensure visibility */}
          {errors.length > 0 && (
            <Box sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              zIndex: 10,
              p: 1, 
              bgcolor: '#ffebee', 
              borderTop: '1px solid #ffcdd2', 
              maxHeight: 100, 
              overflowY: 'auto' 
            }}>
              {errors.map((err, i) => (
                <Alert severity="error" key={i} sx={{ mb: 0.5, py: 0 }}>
                  行 {err.line}: {err.message}
                </Alert>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Bottom Panel: Info */}
      <Paper 
        elevation={3} 
        sx={{ 
          height: bottomPanelHeight, 
          p: 2, 
          borderRadius: 0,
          borderTop: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
      >
        <Typography variant="body2" color="textSecondary">
          <strong>作者:</strong> Haokee, Claude Opus 4.5, Gemini 3 Pro
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          <strong>简介:</strong> 一个采用 TypeScript 编写的 Web 应用，使图论可视化。采用自研物理引擎模拟点之间的斥力和点和边的弹力。
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <Link href="https://github.com/haokee-git/graph/" target="_blank" rel="noopener">
            https://github.com/haokee-git/graph/
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default App;
