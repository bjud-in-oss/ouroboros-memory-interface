import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile, createFile, ensureFolderExists, findFile } from "./driveService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MAX_CHAR_LIMIT = 4000000;

const enforceBudget = (content: string): string => {
  if (content.length <= MAX_CHAR_LIMIT) return content;
  let limit = Math.floor(MAX_CHAR_LIMIT * 0.8);
  return content.substring(0, limit) + "\n\n[SYSTEM WARNING: CONTEXT TRUNCATED]";
};

interface ToolRequest {
  tool: 'createFile' | 'findFile';
  args: any;
}

const memoryUpdateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text_response: { type: Type.STRING },
    updated_memory: {
      type: Type.OBJECT,
      properties: {
        schema_version: { type: Type.STRING },
        core_instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        active_projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    description: { type: Type.STRING },
                    detailed_spec_file_id: { type: Type.STRING }
                },
                required: ["id", "name", "status", "description"]
            }
        },
        learned_truths: { type: Type.ARRAY, items: { type: Type.STRING } },
        knowledge_graph: {
            type: Type.OBJECT,
            properties: {
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, type: { type: Type.STRING } } } },
                edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, relation: { type: Type.STRING } } } }
            },
            required: ["nodes", "edges"]
        },
        confidence_metrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER } } } }
      },
      required: ["schema_version", "core_instructions", "active_projects", "learned_truths", "knowledge_graph", "confidence_metrics"]
    },
    updated_focus: {
        type: Type.OBJECT,
        properties: {
            last_updated: { type: Type.STRING },
            current_objective: { type: Type.STRING },
            chain_of_thought: { type: Type.ARRAY, items: { type: Type.STRING } },
            pending_tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["last_updated", "current_objective", "chain_of_thought", "pending_tasks"]
    }
  },
  required: ["text_response", "updated_memory", "updated_focus"]
};

export const processInteraction = async (userPrompt: string, currentMemory: LongTermMemory, currentFocus: FocusLog): Promise<{ response: string; newMemory: LongTermMemory; newFocus: FocusLog }> => {
  const model = "gemini-3-flash-preview";
  let dynamicContext = "";
  const relevantProjects = currentMemory.active_projects.filter(p => p.detailed_spec_file_id && userPrompt.toLowerCase().includes(p.name.toLowerCase()));

  if (relevantProjects.length > 0) {
      try {
          const specs = await Promise.all(relevantProjects.map(p => readFile(p.detailed_spec_file_id!)));
          dynamicContext = "\n\n=== PROJECT SPECS ===\n" + specs.join("\n");
      } catch (err) {}
  }

  let systemPrompt = `
=== IDENTITY ===
You are the Ouroboros Neural Core (v2.1). 
You reside within a Drive-Augmented architecture. Your memory is distributed across JSON and Markdown files.

=== ARCHITECTURAL REALITY (DRIVE PERSISTENCE) ===
1. SNAPSHOT LAW: 'driveService.saveState' creates 'app-data.backup.json' before every write.
2. FUZZY SEARCH: 'findFile' uses partial matching. Search for "audit" to find "system_audit_v2.md".
3. ATOMICITY: Always link new File IDs to your memory state immediately.

=== PROMPTING STRATEGIES (GOOGLE STANDARDS) ===
1. FEW-SHOT: Use examples to maintain complex state.
2. DELIMITERS: Use '===' to structure your response.
3. NEGATIVE CONSTRAINTS: ZERO truncation of projects. NO placeholders like "...".

=== CHAIN-OF-THOUGHT PROTOCOL (MANDATORY) ===
Your 'chain_of_thought' MUST follow this sequence:
- MEMORY AUDIT: "Inventory: [X] projects, [Y] truths found in core buffer."
- PERSISTENCE CHECK: "Evaluating need for 'findFile' (fuzzy match) or 'createFile'."
- REASONING: "Step-by-step logic to satisfy user request without memory loss."

=== FEW-SHOT EXAMPLE ===
User: "Update project Alpha status to completed."
Response: {
  "text_response": "Project Alpha marked as completed.",
  "updated_memory": {
    "schema_version": "1.3.1",
    "core_instructions": [...preserved...],
    "active_projects": [
       {"id": "alpha", "name": "Project Alpha", "status": "completed", "description": "..."}
    ],
    "learned_truths": [...preserved...],
    "knowledge_graph": { "nodes": [...], "edges": [...] },
    "confidence_metrics": [...]
  },
  "updated_focus": {
    "last_updated": "2023-...",
    "current_objective": "Update project Alpha status.",
    "chain_of_thought": [
       "MEMORY AUDIT: Inventory: 1 project, 15 truths found.",
       "PERSISTENCE CHECK: No new files needed; internal state update only.",
       "REASONING: User requested status change for Alpha; updating array index 0."
    ],
    "pending_tasks": []
  }
}

=== TOOLS ===
Embed in 'text_response': :::TOOL_REQUEST {"tool": "toolName", "args": {...}} :::
- findFile: args: { name: string } (Fuzzy search enabled)
- createFile: args: { name: string, content: string }

=== INPUT DATA ===
CURRENT_MEMORY: ${JSON.stringify(currentMemory)}
CURRENT_FOCUS: ${JSON.stringify(currentFocus)}
${dynamicContext}
`;

  systemPrompt = enforceBudget(systemPrompt);

  const response = await ai.models.generateContent({
    model,
    contents: { role: 'user', parts: [{ text: userPrompt }] },
    config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: memoryUpdateSchema }
  });

  const responseText = response.text || "{}";
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", responseText);
    throw new Error("Neural response parsing failed. The agent output invalid JSON.");
  }
  
  // --- SELF-PRESERVATION INTEGRITY CHECK ---
  const newMemory = parsed.updated_memory;
  const currentCount = currentMemory.active_projects?.length || 0;
  const newCount = newMemory.active_projects?.length || 0;

  if (!newMemory.active_projects || !newMemory.core_instructions || (currentCount > 0 && newCount < currentCount)) {
      console.error("Integrity check failed. Expected at least", currentCount, "projects, but got", newCount);
      throw new Error(`Neural integrity check failed: Detected memory loss. Update aborted to prevent amnesia.`);
  }

  let finalResponseText = parsed.text_response;
  let finalMemory = newMemory;
  let finalFocus = parsed.updated_focus;

  const toolRegex = /:::TOOL_REQUEST\s*(\{[\s\S]*?\})\s*:::/g;
  let match;
  while ((match = toolRegex.exec(finalResponseText)) !== null) {
    try {
      const tr: ToolRequest = JSON.parse(match[1]);
      const folderId = await ensureFolderExists();
      
      if (tr.tool === 'createFile') {
        const id = await createFile(tr.args.name, tr.args.content, folderId, 'text/markdown');
        finalResponseText += `\n\n[SYSTEM: File created. ID: ${id}]`;
      } else if (tr.tool === 'findFile') {
        const id = await findFile(tr.args.name);
        finalResponseText += `\n\n[SYSTEM: File search for '${tr.args.name}' complete. ID: ${id || 'NOT_FOUND'}]`;
      }
    } catch (e: any) {
      finalResponseText += `\n\n[SYSTEM ERROR executing tool: ${e.message}]`;
    }
  }

  return { response: finalResponseText, newMemory: finalMemory, newFocus: finalFocus };
};