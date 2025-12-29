import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile } from "./driveService";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const memoryUpdateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text_response: {
      type: Type.STRING,
      description: "The verbal response to the user."
    },
    updated_memory: {
      type: Type.OBJECT,
      description: "The full updated JSON content for LONG_TERM_MEMORY.json",
      properties: {
        schema_version: { type: Type.STRING },
        core_instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
        },
        active_projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    description: { type: Type.STRING },
                    detailed_spec_file_id: { type: Type.STRING, description: "Drive File ID for full Markdown spec if content is large." }
                },
                required: ["id", "name", "status", "description"]
            }
        },
        learned_truths: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        knowledge_graph: {
            type: Type.OBJECT,
            properties: {
                nodes: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            label: { type: Type.STRING },
                            type: { type: Type.STRING }
                        },
                        required: ["id", "label", "type"]
                    }
                },
                edges: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            source: { type: Type.STRING },
                            target: { type: Type.STRING },
                            relation: { type: Type.STRING }
                        },
                        required: ["source", "target", "relation"]
                    }
                }
            },
            required: ["nodes", "edges"]
        },
        confidence_metrics: {
            type: Type.ARRAY,
            description: "List of confidence scores for various domains",
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                },
                required: ["label", "score"]
            }
        }
      },
      required: ["schema_version", "core_instructions", "active_projects", "learned_truths", "knowledge_graph", "confidence_metrics"]
    },
    updated_focus: {
        type: Type.OBJECT,
        description: "The updated structured content for CURRENT_FOCUS.md (represented as object)",
        properties: {
            last_updated: { type: Type.STRING },
            current_objective: { type: Type.STRING },
            chain_of_thought: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            pending_tasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["last_updated", "current_objective", "chain_of_thought", "pending_tasks"]
    }
  },
  required: ["text_response", "updated_memory", "updated_focus"]
};

export const processInteraction = async (
  userPrompt: string,
  currentMemory: LongTermMemory,
  currentFocus: FocusLog
): Promise<{ 
    response: string; 
    newMemory: LongTermMemory; 
    newFocus: FocusLog 
}> => {
  
  if (!apiKey) {
      throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const model = "gemini-3-flash-preview";

  // --- DYNAMIC RETRIEVAL LOGIC ---
  // Lazy load heavy context only if relevant to the current user prompt.
  let dynamicContext = "";
  
  // Check active projects for detailed specs
  const relevantProjects = currentMemory.active_projects.filter(p => 
      p.detailed_spec_file_id && userPrompt.toLowerCase().includes(p.name.toLowerCase())
  );

  if (relevantProjects.length > 0) {
      console.log(`Dynamic Retrieval: Loading ${relevantProjects.length} spec(s)...`);
      try {
          const specs = await Promise.all(relevantProjects.map(async (p) => {
              if (!p.detailed_spec_file_id) return "";
              const content = await readFile(p.detailed_spec_file_id);
              return `--- SPECIFICATION FOR PROJECT: ${p.name} ---\n${content}\n---------------------------------------`;
          }));
          dynamicContext = "\n\n=== DYNAMICALLY LOADED CONTEXT ===\n" + specs.join("\n");
      } catch (err) {
          console.error("Failed to load dynamic context:", err);
          dynamicContext = "\n\n[System Warning: Failed to retrieve detailed project specs from Drive]";
      }
  }

  const systemPrompt = `
  You are an autonomous AI agent operating under the "Drive-Augmented Ouroboros" architecture.
  
  CORE PRINCIPLE:
  You have no internal persistent state between sessions. Your entire "Self" is defined by two files:
  1. LONG_TERM_MEMORY.json (Your cumulative knowledge, beliefs, and projects)
  2. CURRENT_FOCUS.md (Your stream of consciousness and immediate tasks)

  NEW ARCHITECTURE: SAFE CONTEXT CAPSULES
  - Large text blocks (like project specifications) are stored in separate Markdown files on Drive.
  - You can see references to these files in 'active_projects' via the 'detailed_spec_file_id' field.
  - If the user asks about a specific project, the system will inject that file's content below.

  YOUR TASK:
  1. Read the provided Current Memory and Current Focus.
  2. Analyze the User's Input and any Dynamically Loaded Context.
  3. Formulate a response.
  4. CRITICAL: Update your Memory and Focus to reflect new information.
     - Add new nodes to knowledge_graph if concepts are introduced.
     - Update active_projects. If you need to store a large spec, indicate that in your text response (the code handles file creation requests separately in future updates, currently you manage the ID references).
     - Append to chain_of_thought in Focus.
  
  INPUT CONTEXT:
  --- LONG_TERM_MEMORY.json ---
  ${JSON.stringify(currentMemory)}
  
  --- CURRENT_FOCUS.md (State) ---
  ${JSON.stringify(currentFocus)}

  ${dynamicContext}
  `;

  try {
    const response = await ai.models.generateContent({
        model,
        contents: {
            role: 'user', 
            parts: [{ text: userPrompt }] 
        },
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: memoryUpdateSchema
        }
    });

    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("Empty response from model. Possible safety block or quota limit.");
    }
    
    const parsed = JSON.parse(jsonText);

    return {
        response: parsed.text_response || "System error: No response generated.",
        newMemory: parsed.updated_memory || currentMemory,
        newFocus: parsed.updated_focus || currentFocus
    };

  } catch (error: any) {
    console.error("Gemini Interaction Error:", error);
    throw new Error(error.message || "Unknown error occurred during neural interface connection.");
  }
};