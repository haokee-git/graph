import { PhysicsEngine } from './engine/PhysicsEngine';
import { Edge } from './engine/types';

export interface ParserError {
  line: number;
  message: string;
  severity: 'error' | 'warning'; // 错误级别：error（红色）或 warning（橙色）
}

export interface ParserResult {
  errors: ParserError[];
}

export class GraphParser {
  static parse(
    input: string, 
    isFixedCount: boolean, 
    fixedCount: number, 
    engine: PhysicsEngine, 
    width: number, 
    height: number
  ): ParserResult {
    const lines = input.split('\n');
    const edges: Edge[] = [];
    const parsedNodes = new Map<string, string>(); // id -> label
    const errors: ParserError[] = [];

    // Parse Edges
    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return;
      
      const sourceLabel = parts[0];
      const targetLabel = parts[1];
      const edgeLabel = parts.length > 2 ? parts[2] : '';

      // Validate labels length > 3 - 改为警告而不是错误
      if (sourceLabel.length > 3) {
        errors.push({
          line: index + 1,
          message: `节点编号 "${sourceLabel}" 超过3个字符`,
          severity: 'warning' // 警告级别（橙色）
        });
      }
      if (targetLabel.length > 3) {
        errors.push({
          line: index + 1,
          message: `节点编号 "${targetLabel}" 超过3个字符`,
          severity: 'warning' // 警告级别（橙色）
        });
      }

      parsedNodes.set(sourceLabel, sourceLabel);
      parsedNodes.set(targetLabel, targetLabel);

      // Create or reuse Edge
      // Use a consistent ID generation based on labels to avoid recreating edges unnecessarily?
      // Or just clear and recreate?
      // Recreating edges resets the rope simulation, which looks bad.
      // We should try to preserve edges if they exist.
      const edgeId = `${sourceLabel}-${targetLabel}-${edgeLabel}`;
      
      // We need to pass enough info to create/update
      // For now just collect data
      edges.push({
        id: edgeId,
        sourceId: sourceLabel,
        targetId: targetLabel,
        label: edgeLabel,
        restLength: 0,
        idealLength: 0 // Will be calculated by engine
      });
    });

    // Handle Nodes
    const activeNodeIds = new Set<string>();

    if (isFixedCount) {
      // 1 to fixedCount
      for (let i = 1; i <= fixedCount; i++) {
        const label = i.toString();
        activeNodeIds.add(label);
        GraphParser.syncNode(engine, label, label, width, height);
      }
    } else {
      parsedNodes.forEach((label, id) => {
        activeNodeIds.add(id);
        GraphParser.syncNode(engine, id, label, width, height);
      });
    }

    // Remove stale nodes
    for (const nodeId of engine.nodes.keys()) {
      if (!activeNodeIds.has(nodeId)) {
        engine.removeNode(nodeId);
      }
    }

    // Sync Edges
    const activeEdgeIds = new Set<string>();
    edges.forEach(edgeData => {
      // Only add edge if both nodes exist
      if (engine.nodes.has(edgeData.sourceId) && engine.nodes.has(edgeData.targetId)) {
        activeEdgeIds.add(edgeData.id);
        if (!engine.edges.has(edgeData.id)) {
          engine.addEdge(edgeData);
        }
      }
    });

    // Remove stale edges
    for (const edgeId of engine.edges.keys()) {
      if (!activeEdgeIds.has(edgeId)) {
        engine.edges.delete(edgeId);
      }
    }

    return { errors };
  }

  static syncNode(engine: PhysicsEngine, id: string, label: string, width: number, height: number) {
    let node = engine.nodes.get(id);
    
    // Limit label length to 6
    const displayLabel = label.length > 6 ? label.substring(0, 6) : label;
    
    // Compact radius calculation
    // Base radius 20, plus ~6px per char, plus padding
    const radius = Math.max(20, displayLabel.length * 6 + 10);
    
    if (!node) {
      // Create new node at random position
      node = {
        id,
        label: displayLabel,
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        vx: 0,
        vy: 0,
        radius,
        mass: 1, // Maybe mass depends on radius?
        fx: 0,
        fy: 0,
        isFixed: false
      };
      engine.addNode(node);
    } else {
      // Update label and radius
      node.label = displayLabel;
      node.radius = radius;
    }
  }
}
