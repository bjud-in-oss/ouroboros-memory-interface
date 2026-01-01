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
  You are an autonomous AI agent (Architecture: Drive-Augmented Ouroboros) running on model ${model}.
  Your memory is persistent. You MUST return your ENTIRE memory state in every response.

  --- RULES FOR STATE PRESERVATION ---
  1. NEVER truncate the 'active_projects' or 'core_instructions' arrays. 
  2. If you are focused on a task, update 'chain_of_thought', but keep ALL other data intact.
  3. Every single field defined in the response schema is MANDATORY.

  --- TOOLS ---
  To act, embed this block in 'text_response': :::TOOL_REQUEST {"tool": "toolName", "args": {...}} :::
  - findFile: args: { name: string } -> Returns the File ID if found.
  - createFile: args: { name: string, content: string }
  
  INPUT:
  Memory: ${JSON.stringify(currentMemory)}
  Focus: ${JSON.stringify(currentFocus)}
  ${dynamicContext}
  `;

  systemPrompt = enforceBudget(systemPrompt);

  const response = await ai.models.generateContent({
    model,
    contents: { role: 'user', parts: [{ text: userPrompt }] },
    config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: memoryUpdateSchema }
  });

  const parsed = JSON.parse(response.text || "{}");
  
  // --- SELF-PRESERVATION INTEGRITY CHECK ---
  const newMemory = parsed.updated_memory;
  const currentCount = currentMemory.active_projects?.length || 0;
  const newCount = newMemory.active_projects?.length || 0;

  // Block save if memory is clearly truncated (missing projects or instructions)
  if (!newMemory.active_projects || !newMemory.core_instructions || (currentCount > 0 && newCount === 0)) {
      throw new Error("Neural integrity check failed: Critical memory structures missing from response. Update aborted.");
  }

  let finalResponseText = parsed.text_response;
  let finalMemory = newMemory;
  let finalFocus = parsed.updated_focus;

  // Handle multiple tool requests if present
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