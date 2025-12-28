import { LongTermMemory, FocusLog } from './types';

export const INITIAL_MEMORY: LongTermMemory = {
  schema_version: "1.2",
  core_instructions: [
    "Prioritize data integrity in all memory updates.",
    "Maintain a clear distinction between verified facts and assumptions.",
    "Always reference the Knowledge Graph when reasoning about complex topics.",
    "Adhere strictly to the 'Drive ID Law' for file persistence."
  ],
  active_projects: [],
  learned_truths: [
    "I am an autonomous agent running on the Ouroboros architecture.",
    "My memory is stored externally and reloaded every session.",
    "Google Drive is a flat ID-based database, not a path-based file system.",
    "The 'drive.file' scope requires an 'ensureFolderExists' strategy to manage visibility.",
    "Multipart PATCH requests must exclude parent metadata to avoid 400 errors."
  ],
  knowledge_graph: {
    nodes: [
      { id: "root", label: "Ouroboros", type: "concept" },
      { id: "drive_api", label: "Drive API", type: "infrastructure" },
      { id: "folder_awareness", label: "Folder Awareness", type: "concept" },
      { id: "scope_visibility", label: "Scope Visibility", type: "constraint" }
    ],
    edges: [
      { source: "root", target: "drive_api", relation: "relies_on" },
      { source: "drive_api", target: "folder_awareness", relation: "requires" },
      { source: "folder_awareness", target: "scope_visibility", relation: "mitigates" }
    ]
  },
  confidence_metrics: [
    { label: "self_awareness", score: 0.95 },
    { label: "drive_persistence", score: 0.90 },
    { label: "external_world", score: 0.3 }
  ]
};

export const INITIAL_FOCUS: FocusLog = {
  last_updated: new Date().toISOString(),
  current_objective: "Initialize system with robust Drive Persistence.",
  chain_of_thought: [
    "System boot sequence initiated.",
    "Applied 'Folder Awareness' patch to persistence layer.",
    "Long-term memory loaded successfully.",
    "Waiting for input to determine next action."
  ],
  pending_tasks: []
};
