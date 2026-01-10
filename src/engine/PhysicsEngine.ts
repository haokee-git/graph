import { Node, Edge } from './types';

export class PhysicsEngine {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;

 // Physics Constants
  REPULSION = 1400; // Reduced by 30% from 2000
  STIFFNESS = 0.56; // Reduced by 30% from 0.8
  DAMPING = 0.85;
  GRAVITY = 0; // Disable gravity for planar simulation
  
  // Dynamic Length Constants
  LENGTH_ADJUST_RATE = 1.0; // How fast it shrinks/grows per frame

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addNode(node: Node) {
    this.nodes.set(node.id, node);
  }

  removeNode(id: string) {
    this.nodes.delete(id);
    // Remove connected edges
    for (const [edgeId, edge] of this.edges) {
      if (edge.sourceId === id || edge.targetId === id) {
        this.edges.delete(edgeId);
      }
    }
  }

  addEdge(edge: Edge) {
    const source = this.nodes.get(edge.sourceId);
    const target = this.nodes.get(edge.targetId);
    
    if (source && target) {
      // Calculate initial length
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Initial rest length matches current distance (so it doesn't snap)
      edge.restLength = dist;

      // Calculate ideal length: 3 * average diameter = 3 * (r1 + r2)
      // d1 = 2*r1, d2 = 2*r2, avg = (2*r1 + 2*r2)/2 = r1 + r2
      edge.idealLength = 3 * (source.radius + target.radius);
    }
    this.edges.set(edge.id, edge);
  }

  reconfigureEdges() {
    this.edges.forEach(edge => {
      this.addEdge(edge);
    });
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
  }

  update() {
    const subSteps = 5;
    const dt = 1 / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.step(dt);
    }
  }

  step(dt: number) {
    // Reset forces
    this.nodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
    });

    // 1. Repulsion (Node-Node) & Collision
    const nodes = Array.from(this.nodes.values());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const minDist = n1.radius + n2.radius;
        const repulsionLimit = 5 * (minDist / 2) * 2; // 5 * (r1 + r2)

        // Repulsion
        if (dist < repulsionLimit) {
          const force = this.REPULSION / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!n1.isFixed) {
            n1.fx += fx;
            n1.fy += fy;
          }
          if (!n2.isFixed) {
            n2.fx -= fx;
            n2.fy -= fy;
          }
        }

        // Hard Collision Resolution
        if (dist < minDist) {
           const overlap = minDist - dist;
           const nx = dx / dist;
           const ny = dy / dist;
           
           // Move apart proportionally
           const move = overlap / 2;
           if (!n1.isFixed) {
             n1.x += nx * move;
             n1.y += ny * move;
             // Dampen velocity to prevent jitter
             n1.vx *= 0.5;
             n1.vy *= 0.5;
           }
           if (!n2.isFixed) {
             n2.x -= nx * move;
             n2.y -= ny * move;
             n2.vx *= 0.5;
             n2.vy *= 0.5;
           }
        }
      }
    }

    // 2. Edge Springs (Straight Line Simulation)
    this.edges.forEach(edge => {
      // Dynamic Length Adjustment
      // Slowly adjust restLength towards idealLength
      // Scale adjust rate by dt for consistency (though it's length not force)
      const adjust = this.LENGTH_ADJUST_RATE * dt; 
      if (edge.restLength > edge.idealLength) {
        edge.restLength = Math.max(edge.idealLength, edge.restLength - adjust);
      } else if (edge.restLength < edge.idealLength) {
        edge.restLength = Math.min(edge.idealLength, edge.restLength + adjust);
      }

      const source = this.nodes.get(edge.sourceId);
      const target = this.nodes.get(edge.targetId);
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Hooke's Law for simple spring
      const force = (dist - edge.restLength) * this.STIFFNESS;
      
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      // Apply forces to nodes
      if (!source.isFixed) {
        source.fx += fx;
        source.fy += fy;
      }
      if (!target.isFixed) {
        target.fx -= fx;
        target.fy -= fy;
      }
    });

    // 4. Update Positions (Euler Integration)
    // Scale forces by dt to maintain stability with sub-stepping
    this.nodes.forEach(node => {
      if (!node.isFixed) {
        // Apply force: F=ma -> a=F/m. dv = a*dt.
        node.vx = (node.vx + (node.fx / node.mass) * dt) * this.DAMPING;
        node.vy = (node.vy + (node.fy / node.mass) * dt) * this.DAMPING;
        
        // Update position: dx = v*dt (simplified)
        // Note: Damping is usually applied per frame, but here per substep is fine if tuned.
        // Actually, to keep behavior similar to before, we need to be careful.
        // Previous: vx = (vx + fx/m) * DAMPING; x += vx;
        // Substep: vx += (fx/m)*dt; vx *= DAMPING^(dt?); x += vx*dt;
        // Simple approach:
        node.x += node.vx * dt; // Scale velocity effect
        node.y += node.vy * dt;
      } else {
        node.vx = 0;
        node.vy = 0;
      }
    });
  }
}
