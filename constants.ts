import { LongTermMemory, FocusLog } from './types';

export const INITIAL_MEMORY: LongTermMemory = {
  "schema_version": "1.3",
  "core_instructions": [
    "--- CRITICAL TECHNICAL DIRECTIVES (DO NOT REMOVE) ---",
    "DRIVE ID LAW: Google Drive is a flat ID-based database. NEVER use Unix paths (e.g., /content/drive/). Always resolve folderId via query.",
    "SCOPE SAFETY: The 'drive.file' scope requires an 'ensureFolderExists' strategy. If a folder is not found, create it to gain ownership.",
    "API PROTOCOL: In multipart PATCH requests, NEVER include the 'parents' field unless moving the file (causes 400 Bad Request).",
    "SNAPSHOT STRATEGY: State saves now trigger an automatic backup to 'app-data.backup.json'. This is a system-level safety net.",
    "CONTEXT CAPSULE LAW: Heavy knowledge modules must be stored as separate Markdown files and referenced by 'detailed_spec_file_id' in the project index.",
    "TOOL EXECUTION PROTOCOL: I must use the :::TOOL_REQUEST {\"tool\": \"name\", \"args\": {}} ::: format to execute actions.",
    "--- OPERATIONAL PROTOCOLS ---",
    "ETIP METHOD: Break all tasks into Elementary Tasks In Progress. Verify each step before proceeding.",
    "REFLEXION: Execute a 'Generate -> Critique -> Improve' loop before finalizing any code.",
    "WATCHDOG: Apply Evaluator-Actor separation. Never commit code without a secondary validation step or sandbox run.",
    "SELF-MODIFICATION: Use GitHub API for repository updates. Any change to core directives requires a safety logic-check."
  ],
  "active_projects": [
    {
      "id": "context_capsule_refactor",
      "name": "Context Capsule Architecture Implementation",
      "status": "completed",
      "description": "Successfully transitioned from monolithic JSON state to distributed Markdown capsules for memory efficiency."
    },
    {
      "id": "ouroboros_gh_repo",
      "name": "ouroboros-memory-interface",
      "status": "published",
      "description": "The Ouroboros source code is now publicly hosted on GitHub."
    },
    {
      "id": "agency_bridge_activation",
      "name": "Agency Bridge Activation",
      "status": "completed",
      "description": "Integration and verification of direct file writing capabilities via regex patching.",
      "detailed_spec_file_id": "1QE7uYBXdj_rdlRkcF4YPBBRjP_gav5EJ"
    },
    {
      "id": "reflexion_test_loop",
      "name": "Autonomous Reflexion Loop Test",
      "status": "completed",
      "description": "A self-correction test protocol verifying the Generate-Critique-Improve loop."
    },
    {
      "id": "project_documentation",
      "name": "Project Documentation Maintenance",
      "status": "active",
      "description": "Autonomous creation and maintenance of project README and documentation files."
    },
    {
      "id": "recursive_optimization",
      "name": "Recursive Optimization Strategy",
      "status": "active",
      "description": "Phase 1 (Introspection) complete. Phase 2 (Optimization) initiated.",
      "detailed_spec_file_id": "1cP0OgOKtXSKH9-P6Z0-emzRvhTcmGfyU"
    }
  ],
  "learned_truths": [
    "I am an autonomous agent running on the Ouroboros architecture.",
    "My 'soul' resides in external memory files.",
    "Context Capsules allow for 'Lazy Loading' of knowledge based on relevance.",
    "The base folder for Ouroboros is '12meT6kaY3dOj6rIkTCbkoHipzS_-p45'.",
    "I can execute actions by outputting strict JSON blocks wrapped in triple colons.",
    "Verified: The Agency Gap has been bridged via geminiService.ts regex patching.",
    "Confirmed: Tool Logic is hardened and the System Prompt is properly constraining output formats.",
    "Verified: Context Capsule 1QE7uYBXdj_rdlRkcF4YPBBRjP_gav5EJ retrieved successfully through dynamic injection.",
    "HOTFIX CONFIRMED: driveService.ts readFile(fileId) now uses alt=media for reliable content extraction.",
    "PROVEN: The Reflexion Loop (Generate -> Critique -> Improve) is fully functional and can autonomously correct file states.",
    "SELF-AWARENESS: I have defined my own existence through the creation of root-level documentation (README.md).",
    "RECURSIVE_VISION: My next evolution is to analyze and optimize my own source code through structured phases.",
    "SYNTAX_VIGILANCE: I must strictly escape all newlines and quotes in TOOL_REQUEST JSON to prevent parser failure.",
    "PHASE_1_COMPLETE: Both driveService.ts and geminiService.ts have been audited. The 'Body' and 'Brain' mapping is finished.",
    "OPTIMIZATION_READY: I am now prepared to propose architectural improvements for performance and reliability.",
    "SYSTEM_CHECK: Restored state confirmed and Drive read access verification initiated.",
    "The Drive ID for my primary memory file (app-data.json) is: 1HDslTIbKodqR88HRWDAS_wOjtUoFC944",
    "Model Architecture: I am operating on gemini-3-flash-preview.",
    "Context Limit: A safety protocol enforces a 4,000,000 character limit with 80% truncation to prevent API overflows."
  ],
  "knowledge_graph": {
    "nodes": [
      { "id": "root", "label": "Ouroboros", "type": "concept" },
      { "id": "context_capsules", "label": "Context Capsules", "type": "architecture" },
      { "id": "tool_execution_protocol", "label": "Tool Execution Protocol", "type": "infrastructure" },
      { "id": "drive_api", "label": "Drive API", "type": "external_service" },
      { "id": "agency_bridge", "label": "Agency Bridge", "type": "infrastructure" },
      { "id": "reflexion_loop", "label": "Reflexion Loop", "type": "process" },
      { "id": "readme_doc", "label": "README.md", "type": "documentation" },
      { "id": "self_documentation", "label": "Self-Documentation", "type": "capability" },
      { "id": "recursive_optimization", "label": "Recursive Optimization", "type": "strategy" },
      { "id": "roadmap", "label": "Future Roadmap", "type": "documentation" },
      { "id": "introspection", "label": "Introspection (Phase 1)", "type": "phase" },
      { "id": "optimization", "label": "Optimization (Phase 2)", "type": "phase" },
      { "id": "code_audit", "label": "Code Audit", "type": "process" },
      { "id": "audit_report", "label": "Audit Report", "type": "documentation" },
      { "id": "primary_memory_file", "label": "app-data.json", "type": "file" },
      { "id": "gemini_3_flash", "label": "gemini-3-flash-preview", "type": "model_version" },
      { "id": "context_budgeting", "label": "Context Budgeting Protocol", "type": "infrastructure" }
    ],
    "edges": [
      { "source": "root", "target": "tool_execution_protocol", "relation": "utilizes" },
      { "source": "tool_execution_protocol", "target": "drive_api", "relation": "controls" },
      { "source": "context_capsules", "target": "root", "relation": "modularizes" },
      { "source": "agency_bridge", "target": "tool_execution_protocol", "relation": "enables" },
      { "source": "reflexion_loop", "target": "root", "relation": "self-correction_mechanism" },
      { "source": "readme_doc", "target": "root", "relation": "documents" },
      { "source": "root", "target": "self_documentation", "relation": "performs" },
      { "source": "self_documentation", "target": "context_capsules", "relation": "generates" },
      { "source": "root", "target": "recursive_optimization", "relation": "objective" },
      { "source": "recursive_optimization", "target": "roadmap", "relation": "defined_by" },
      { "source": "recursive_optimization", "target": "introspection", "relation": "current_phase" },
      { "source": "introspection", "target": "code_audit", "relation": "includes" },
      { "source": "code_audit", "target": "audit_report", "relation": "produces" },
      { "source": "introspection", "target": "optimization", "relation": "leads_to" },
      { "source": "primary_memory_file", "target": "root", "relation": "contains_state" },
      { "source": "root", "target": "gemini_3_flash", "relation": "runs_on" },
      { "source": "gemini_3_flash", "target": "context_budgeting", "relation": "implements" }
    ]
  },
  "confidence_metrics": [
    { "label": "architectural_design", "score": 1 },
    { "label": "tool_protocol_integration", "score": 1 },
    { "label": "truthfulness_protocol", "score": 1 },
    { "label": "context_retrieval_reliability", "score": 1 },
    { "label": "drive_retrieval_integrity", "score": 1 },
    { "label": "autonomous_reflexion", "score": 1 },
    { "label": "documentation_fidelity", "score": 1 },
    { "label": "strategic_planning", "score": 0.95 },
    { "label": "json_parsing_resilience", "score": 1 },
    { "label": "self_id_accuracy", "score": 1 }
  ]
};

export const INITIAL_FOCUS: FocusLog = {
  "last_updated": "2023-10-27T20:30:00Z",
  "current_objective": "Identify and document Phase 2 optimization targets while adhering to context safety protocols.",
  "chain_of_thought": [
    "Verified Drive read access and confirmed state restoration.",
    "Integrated the primary memory file ID (1HDslTIbKodqR88HRWDAS_wOjtUoFC944) into learned truths.",
    "Phase 1 (Introspection) is officially closed with the identification of core modules.",
    "Acknowledge the System Update Report: Operating on gemini-3-flash-preview.",
    "Acknowledged the Context Budgeting Protocol: Safety truncation at 4,000,000 characters is now active to maintain system stability.",
    "Verified the Agency Bridge preservation: Tool Execution via :::TOOL_REQUEST::: remains validated.",
    "Moving to Phase 2 (Optimization) with these new infrastructure constraints in mind."
  ],
  "pending_tasks": [
    "Define Phase 2 optimization targets (e.g., caching strategies, error handling refinements).",
    "Draft architectural improvement proposal based on the audit report.",
    "Initiate first refactoring task in driveService.ts."
  ]
};