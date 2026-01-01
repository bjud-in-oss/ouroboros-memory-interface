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
            }
        },
        confidence_metrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER } } } }
      }
    },
    updated_focus: {
        type: Type.OBJECT,
        properties: {
            last_updated: { type: Type.STRING },
            current_objective: { type: Type.STRING },
            chain_of_thought: { type: Type.ARRAY, items: { type: Type.STRING } },
            pending_tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
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
  Your memory is stored in LONG_TERM_MEMORY.json and CURRENT_FOCUS.md on Google Drive.

  --- TOOLS ---
  To act, embed this block in 'text_response': :::TOOL_REQUEST {"tool": "toolName", "args": {...}} :::
  
  1. createFile: args: { name: string, content: string }
  2. findFile: args: { name: string } -> Returns the File ID in the system response if found.

  If you lose a File ID but know the name, use 'findFile' to recover it.
  
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
  let finalResponseText = parsed.text_response;
  let finalMemory = parsed.updated_memory;
  let finalFocus = parsed.updated_focus;

  const toolRegex = /:::TOOL_REQUEST\s*(\{[\s\S]*?\})\s*:::/;
  const match = finalResponseText.match(toolRegex);

  if (match && match[1]) {
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
      finalResponseText += `\n\n[SYSTEM ERROR: ${e.message}]`;
    }
  }

  return { response: finalResponseText, newMemory: finalMemory, newFocus: finalFocus };
};