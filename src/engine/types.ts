export interface Vector {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  fx: number;
  fy: number;
  isFixed: boolean; // For dragging
}

export interface RopeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  mass: number;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  restLength: number; // Current target length (animates towards ideal)
  idealLength: number; // The final target length based on node radii
}
