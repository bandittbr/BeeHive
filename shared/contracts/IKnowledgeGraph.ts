export interface IKnowledgeGraph {
  createNode(type: string, id: string, properties: Record<string, unknown>): Promise<void>;
  createEdge(sourceId: string, targetId: string, relation: string, properties?: Record<string, unknown>): Promise<void>;
  getNode(id: string): Promise<GraphNode | null>;
  query(query: GraphQuery): Promise<GraphResult[]>;
  deleteNode(id: string): Promise<void>;
  deleteEdge(sourceId: string, targetId: string, relation: string): Promise<void>;
}

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  createdAt: number;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relation: string;
  properties: Record<string, unknown>;
  createdAt: number;
}

export interface GraphQuery {
  startType?: string;
  startId?: string;
  relation?: string;
  targetType?: string;
  depth?: number;
  limit?: number;
  filter?: Record<string, unknown>;
}

export interface GraphResult {
  path: GraphNode[];
  edges: GraphEdge[];
  score?: number;
}
