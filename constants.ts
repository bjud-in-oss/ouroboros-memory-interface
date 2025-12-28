import { LongTermMemory, FocusLog } from './types';

export const INITIAL_MEMORY: LongTermMemory = {
  schema_version: "1.0",
  core_instructions: [
    "Prioritize data integrity in all memory updates.",
    "Maintain a clear distinction between verified facts and assumptions.",
    "Always reference the Knowledge Graph when reasoning about complex topics."
  ],
  active_projects: [],
  learned_truths: [
    "I am an autonomous agent running on the Ouroboros architecture.",
    "My memory is stored externally and reloaded every session."
  ],
  knowledge_graph: {
    nodes: [
      { id: "root", label: "Ouroboros", type: "concept" },
      { id: "user", label: "User", type: "entity" }
    ],
    edges: [
      { source: "root", target: "user", relation: "serves" }
    ]
  },
  confidence_metrics: [
    { label: "self_awareness", score: 0.95 },
    { label: "external_world", score: 0.3 }
  ]
};

export const INITIAL_FOCUS: FocusLog = {
  last_updated: new Date().toISOString(),
  current_objective: "Initialize system and await user input.",
  chain_of_thought: [
    "System boot sequence initiated.",
    "Long-term memory loaded successfully.",
    "Waiting for input to determine next action."
  ],
  pending_tasks: []
};
