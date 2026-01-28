export enum NodeStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done',
}

export enum NodeType {
  TASK = 'task',
  MILESTONE = 'milestone',
  DECISION = 'decision',
  START_END = 'start-end',
}

export interface WorkflowNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  description: string;
  status: NodeStatus;
  type: NodeType;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  lastModified: number;
}

export interface CanvasMetadata {
  id: string;
  name: string;
  lastModified: number;
}