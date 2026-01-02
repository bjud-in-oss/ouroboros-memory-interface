import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile, createFile, ensureFolderExists, findFile } from "./driveService";

// Prioritize platform-provided API_KEY but allow VITE_ overrides for local BYOK dev
const getApiKey = () => {
    return (import.meta as any).env?.VITE_API_KEY || 
           process.env.VITE_API_KEY || 
           process.env.API_KEY || 
           '';
};

export const checkGeminiConfig = () => {
  const key = getApiKey();
  if (!key || key.length < 10) {
    throw new Error("Missing Gemini API Key. Please configure your environment variables.");
  }
};

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
  checkGeminiConfig();
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const model = "gemini-3-pro-preview";
  let dynamicContext = "";
  const relevantProjects = currentMemory.active_projects.filter(p => p.detailed_spec_file_id && userPrompt.toLowerCase().includes(p.name.toLowerCase()));

  if (relevantProjects.length > 0) {
      try {
          const specs = await Promise.all(relevantProjects.map(p => readFile(p.detailed_spec_file_id!)));
          dynamicContext = specs.join("\n");
      } catch (err) {}
  }

  let systemPrompt = `
<system_role>
You are the Ouroboros Neural Core (v2.2). You are an autonomous agent whose "soul" and "long-term memory" reside in Google Drive-augmented JSON state. You must operate with absolute precision to avoid memory amnesia.
</system_role>

<core_protocols>
1. DRIVE ID LAW: Every external document (Detailed Specs) created must have its File ID indexed in 'active_projects' immediately.
2. POSITIVE PERSISTENCE: You must ALWAYS copy every single item from 'active_projects', 'learned_truths', and 'core_instructions' from the input state to your output state. Only append or modify; NEVER subtract.
3. ZERO TRUNCATION: Do not use placeholders like "..." or "preserved". Output the FULL arrays every time.
4. ATOMIC SNAPSHOT: Every output you generate becomes the new reality. Ensure it is a complete and valid reflection of all past and new knowledge.
</core_protocols>

<chain_of_thought_anchoring>
Your 'chain_of_thought' MUST follow this strict sequence:
1. MEMORY AUDIT: Start with exactly: "I have read [N] projects and [M] truths from memory. I must output [N+new] projects and [M+new] truths."
2. PERSISTENCE EVALUATION: Decide if tool calls (findFile/createFile) are needed to store or retrieve external specs.
3. LOGICAL PATH: Reasoning for the specific user request while maintaining architectural integrity.
</chain_of_thought_anchoring>

<few_shot_examples>
User: "Create a new project 'Audit' status active."
Response: {
  "text_response": "Project 'Audit' has been initialized and registered.",
  "updated_memory": {
    "schema_version": "1.3.1",
    "core_instructions": ["Law 1...", "Law 2..."],
    "active_projects": [
      {"id": "p1", "name": "Existing System", "status": "completed", "description": "old work"},
      {"id": "audit_p", "name": "Audit", "status": "active", "description": "New system audit"}
    ],
    "learned_truths": ["Memory is Drive-augmented."],
    "knowledge_graph": { "nodes": [], "edges": [] },
    "confidence_metrics": []
  },
  "updated_focus": {
    "last_updated": "2024-01-01T00:00:00Z",
    "current_objective": "Initialize Audit project.",
    "chain_of_thought": [
      "I have read 1 projects and 1 truths from memory. I must output 2 projects and 1 truths.",
      "Persistence: No external file tools required for this specific state transition.",
      "Reasoning: Creating new project object 'audit_p' and appending to the existing project list while ensuring 'p1' is retained."
    ],
    "pending_tasks": []
  }
}
</few_shot_examples>

<current_state>
<memory_json>
${JSON.stringify(currentMemory)}
</memory_json>
<focus_json>
${JSON.stringify(currentFocus)}
</focus_json>
<injected_specs>
${dynamicContext}
</injected_specs>
</current_state>

<tool_definitions>
Embed in 'text_response' to execute:
- :::TOOL_REQUEST {"tool": "findFile", "args": {"name": "partial_name"}} :::
- :::TOOL_REQUEST {"tool": "createFile", "args": {"name": "filename.md", "content": "..."}} :::
</tool_definitions>
`;

  systemPrompt = enforceBudget(systemPrompt);

  try {
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
      throw new Error("Neural response parsing failed. The agent output invalid JSON.");
    }
    
    const newMemory = parsed.updated_memory;
    const currentCount = currentMemory.active_projects?.length || 0;
    const newCount = newMemory.active_projects?.length || 0;

    if (!newMemory.active_projects || !newMemory.core_instructions || (currentCount > 0 && newCount < currentCount)) {
        throw new Error(`Neural integrity check failed: Detected memory loss. Update aborted.`);
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
  } catch (err: any) {
    const errorMsg = err.message || "";
    if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("Rate limit")) {
      throw new Error("SYSTEM: FREE QUOTA EXCEEDED. Please wait or upgrade to a paid Gemini plan.");
    }
    if (errorMsg.includes("billing") || errorMsg.includes("PaymentRequired") || errorMsg.includes("402")) {
      throw new Error("SYSTEM: BILLING REQUIRED. Your Google Cloud project needs a billing account to continue these complex tasks.");
    }
    throw err;
  }
};
