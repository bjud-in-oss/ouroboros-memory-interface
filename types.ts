export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'project' | 'truth';
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'completed' | 'archived';
  description: string;
}

export interface ConfidenceMetric {
  label: string;
  score: number;
}

export interface LongTermMemory {
  schema_version: string;
  core_instructions: string[];
  active_projects: Project[];
  learned_truths: string[];
  knowledge_graph: KnowledgeGraph;
  confidence_metrics: ConfidenceMetric[];
}

export interface FocusLog {
  last_updated: string;
  current_objective: string;
  chain_of_thought: string[];
  pending_tasks: string[];
}

export interface OuroborosState {
  memory: LongTermMemory;
  focus: FocusLog;
}

/**
 * The master data structure stored in Google Drive as 'app-data.json'.
 * This encapsulates the entire persistent state of the agent.
 */
export interface AppData {
  app_version: string;
  last_sync_timestamp: number;
  memory: LongTermMemory;
  focus: FocusLog;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}
