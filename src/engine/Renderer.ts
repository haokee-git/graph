import { PhysicsEngine } from './PhysicsEngine';
import { Node } from './types';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  engine: PhysicsEngine;
  width: number;
  height: number;
  scale: number = 1.0;
  offsetX: number = 0;
  offsetY: number = 0;
  hoveredNodeId: string | null = null;

  constructor(ctx: CanvasRenderingContext2D, engine: PhysicsEngine) {
    this.ctx = ctx;
    this.engine = engine;
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.canvas.width = width * dpr;
    this.ctx.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.canvas.style.width = `${width}px`;
    this.ctx.canvas.style.height = `${height}px`;
  }

  draw(isDirected: boolean) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.save();
    // Center zoom? For now just simple scale from top-left
    // Or we can try to center it. 
    // Let's stick to simple scaling first as requested.
    // Actually, scaling from 0,0 is usually fine if we have pan, but we don't have pan.
    // Scaling from center is better.
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(-centerX, -centerY);
    this.ctx.translate(this.offsetX, this.offsetY);

    // Draw Edges
    this.engine.edges.forEach(edge => {
      const source = this.engine.nodes.get(edge.sourceId);
      const target = this.engine.nodes.get(edge.targetId);
      if (!source || !target) return;

      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(target.x, target.y);
      
      this.ctx.strokeStyle = '#666';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw Arrow if directed
      if (isDirected) {
        // Calculate direction vector
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const angle = Math.atan2(dy, dx);
        
        // Offset by target radius so arrow touches the circle
        const offset = target.radius; 
        const arrowX = target.x - Math.cos(angle) * offset;
        const arrowY = target.y - Math.sin(angle) * offset;

        this.drawArrow(arrowX, arrowY, angle);
      }

      // Draw Label (at middle of rope)
      if (edge.label) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        this.ctx.font = '12px BodyFont';
        const textMetrics = this.ctx.measureText(edge.label);
        const textWidth = textMetrics.width;
        const textHeight = 14; // Approx height
        const padding = 4;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = textHeight + padding * 2;

        // Draw Rounded Rect Background
        this.ctx.save();
        this.ctx.translate(midX, midY);
        
        // Background
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.beginPath();
        this.roundRect(
          -rectWidth / 2, 
          -rectHeight / 2, 
          rectWidth, 
          rectHeight, 
          4
        );
        this.ctx.fill();

        // Border (Dashed)
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();

        // Text
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(edge.label, 0, 0); // Already translated
        
        this.ctx.restore();
      }
    });

    // Draw Nodes
    this.engine.nodes.forEach(node => {
      this.drawNode(node);
    });

    this.ctx.restore();
  }

  drawNode(node: Node) {
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    
    // Highlight if hovered
    if (this.hoveredNodeId === node.id) {
      this.ctx.strokeStyle = '#2196f3'; // Blue highlight
      this.ctx.lineWidth = 4;
    } else {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
    }
    
    this.ctx.stroke();

    this.ctx.font = '14px BodyFont';
    this.ctx.fillStyle = '#000';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(node.label, node.x, node.y);
  }

  // Helper for rounded rect
  roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  drawArrow(x: number, y: number, angle: number) {
    const headLen = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
}
