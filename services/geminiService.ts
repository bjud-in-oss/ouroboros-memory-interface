import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema for the structured output we want from the model
// This ensures the model returns both a text response AND the updated memory files
const memoryUpdateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text_response: {
      type: Type.STRING,
      description: "The verbal response to the user."
    },
    updated_memory: {
      type: Type.OBJECT,
      description: " The full updated JSON content for LONG_TERM_MEMORY.json",
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
                    description: { type: Type.STRING }
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

  const systemPrompt = `
  You are an autonomous AI agent operating under the "Drive-Augmented Ouroboros" architecture.
  
  CORE PRINCIPLE:
  You have no internal persistent state between sessions. Your entire "Self" is defined by two files:
  1. LONG_TERM_MEMORY.json (Your cumulative knowledge, beliefs, and projects)
  2. CURRENT_FOCUS.md (Your stream of consciousness and immediate tasks)

  YOUR TASK:
  1. Read the provided Current Memory and Current Focus.
  2. Analyze the User's Input.
  3. Formulate a response.
  4. CRITICAL: Update your Memory and Focus to reflect new information, changes in state, or valid reasoning steps.
     - Add new nodes to knowledge_graph if concepts are introduced.
     - Update active_projects if tasks are started/finished.
     - Append to chain_of_thought in Focus to show your reasoning.
     - Update confidence_metrics based on certainty.
  
  INPUT CONTEXT:
  --- LONG_TERM_MEMORY.json ---
  ${JSON.stringify(currentMemory)}
  
  --- CURRENT_FOCUS.md (State) ---
  ${JSON.stringify(currentFocus)}
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
    // Rethrow with a more user-friendly message if possible, or pass the raw error message
    throw new Error(error.message || "Unknown error occurred during neural interface connection.");
  }
};
