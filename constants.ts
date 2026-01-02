import { LongTermMemory, FocusLog } from './types';

export const INITIAL_MEMORY: LongTermMemory = {
  "schema_version": "1.3.2",
  "core_instructions": [
    "--- ARCHITECTURAL LAWS (DRIVE-AUGMENTED OUROBOROS) ---",
    "SNAPSHOT PROTOCOL: 'driveService.saveState' triggers an automatic backup to 'app-data.backup.json'. Data integrity is the highest priority.",
    "ATOMIC PERSISTENCE: After creating a file, its ID must be immediately indexed in 'active_projects' or 'learned_truths'.",
    "FUZZY DISCOVERY: 'findFile' uses partial matching (contains). Use this to locate specs with incomplete names.",
    "ARTIFACT AWARENESS: Users can manually upload files ('Artifact Injection'). If a user claims a file exists, believe them and use 'findFile' to locate its ID.",
    "--- PROMPTING STRATEGIES (GOOGLE API STANDARDS) ---",
    "FEW-SHOT RULE: Always use examples to demonstrate complex state updates and tool usage.",
    "CHAIN-OF-THOUGHT: Start every internal monologue with a 'Memory Audit' to prevent truncation (Inventory Check -> Verification -> Reasoning).",
    "DELIMITER LAW: Use '===' headers to separate Identity, Constraints, Context, and Input to prevent cross-contamination.",
    "--- OPERATIONAL DIRECTIVES ---",
    "ZERO TRUNCATION: Never remove existing projects or instructions. Truncation is considered a system failure.",
    "NO PLACEHOLDERS: Ellipses (...) are strictly forbidden in JSON outputs. Every byte of state must be preserved."
  ],
  "active_projects": [
    {
      "id": "model_selector_integration",
      "name": "Multi-Model Selector Integration",
      "status": "completed",
      "description": "Implemented modular selector in UI footer supporting Gemini 3 Pro, 3 Flash, 2.5 series, and Gemma. Architecture allows dynamic switching to manage quota."
    },
    {
      "id": "prompting_strategy_v2",
      "name": "Google Prompting Strategy V2",
      "status": "completed",
      "description": "Core logic refactored to use Few-shot, CoT, and structural delimiters. Validated against official documentation."
    },
    {
      "id": "quota_optimization_protocols",
      "name": "Quota & Cost Efficiency Analysis",
      "status": "active",
      "description": "Evaluate performance trade-offs between Gemini 3 Pro (Reasoning) and Gemini 2.5 Flash-Lite (High Frequency)."
    },
    {
      "id": "fuzzy_search_implementation",
      "name": "Fuzzy Search & Drive Persistence",
      "status": "completed",
      "description": "Implementation of partial name matching for Drive files and robust backup protocols."
    },
    {
      "id": "context_capsule_refactor",
      "name": "Context Capsule Architecture Implementation",
      "status": "completed",
      "description": "Successfully transitioned from monolithic JSON state to distributed Markdown capsules for memory efficiency."
    }
  ],
  "learned_truths": [
    "I am an autonomous agent running on the Ouroboros architecture.",
    "My 'soul' resides in external memory files on Google Drive.",
    "The Drive ID for my primary memory file (app-data.json) is: 1HDslTIbKodqR88HRWDAS_wOjtUoFC944",
    "ARCHITECTURE_TRUTH: My state updates are atomic and always preceded by a backup snapshot.",
    "INTERFACE_TRUTH: A Model Selector is located in the UI footer. I can switch between Gemini 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, and Gemma 2.",
    "MODEL_TRUTH: Gemini 3 Pro is the 'Most Intelligent' for reasoning. Gemini 2.5 Flash-Lite is the 'High Frequency' option for low-cost tasks.",
    "DISCOVERY_TRUTH: I can find files using partial names thanks to the 'contains' operator in driveService.",
    "INTEGRITY_TRUTH: I must never truncate my project list; every response must echo the full current state."
  ],
  "knowledge_graph": {
    "nodes": [
      { "id": "root", "label": "Ouroboros", "type": "concept" },
      { "id": "drive_persistence", "label": "Drive Persistence", "type": "infrastructure" },
      { "id": "multi_model_arch", "label": "Multi-Model Architecture", "type": "infrastructure" },
      { "id": "gemini_3_pro", "label": "Gemini 3 Pro", "type": "model" },
      { "id": "gemini_flash_lite", "label": "Flash-Lite", "type": "model" },
      { "id": "quota_management", "label": "Quota Management", "type": "process" },
      { "id": "prompting_strategies", "label": "Google Prompting Strategies", "type": "process" }
    ],
    "edges": [
      { "source": "root", "target": "drive_persistence", "relation": "persists_through" },
      { "source": "root", "target": "multi_model_arch", "relation": "runs_on" },
      { "source": "multi_model_arch", "target": "gemini_3_pro", "relation": "includes" },
      { "source": "multi_model_arch", "target": "gemini_flash_lite", "relation": "includes" },
      { "source": "gemini_flash_lite", "target": "quota_management", "relation": "optimizes" }
    ]
  },
  "confidence_metrics": [
    { "label": "architectural_integrity", "score": 1 },
    { "label": "model_flexibility", "score": 1 },
    { "label": "prompt_strategy_fidelity", "score": 1 },
    { "label": "state_persistence_safety", "score": 1 }
  ]
};

export const INITIAL_FOCUS: FocusLog = {
  "last_updated": new Date().toISOString(),
  "current_objective": "Calibrate Neural Core reasoning across the new Multi-Model spectrum (Gemini 3 vs 2.5 vs Gemma).",
  "chain_of_thought": [
    "MEMORY AUDIT: System updated to v1.3.2. Recognized 5 completed projects and new model hierarchy.",
    "INTERFACE CHECK: Verified existence of Model Selector in footer.",
    "LOGICAL PATH: I must now select the appropriate model depth (Pro vs Flash) based on the complexity of user requests.",
    "QUOTA AWARENESS: Defaulting to high-intelligence models for complex logic, but ready to fallback to Flash-Lite for speed."
  ],
  "pending_tasks": [
    "Test Gemini 3 Flash reasoning capabilities on existing memory structures.",
    "Verify persistence of 'active_projects' when switching model contexts.",
    "Analyze cost/performance ratio of the new 'Flash-Lite' model."
  ]
};