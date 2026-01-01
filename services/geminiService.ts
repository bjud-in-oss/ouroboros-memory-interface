import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile, createFile, ensureFolderExists } from "./driveService";
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
// --- CONTEXT BUDGETING CONSTANTS ---
// 80% av kontextfönstret på 4M tecken = 1M tokens kan användas.
const MAX_CHAR_LIMIT = 4000000;
// Define the interface for a parsed tool request
interface ToolRequest {
  tool: 'createFile';
  args: {
    name: string;
    content: string;
    mimeType?: string;
  };
}
// ... [BEHÅLL HELA memoryUpdateSchema HÄR - DET ÄR OFÖRÄNDRAT] ...
const memoryUpdateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text_response: { type: Type.STRING, description: "The verbal response..." },
    updated_memory: {
      type: Type.OBJECT,
      description: "The full updated JSON content...",
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
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type:Type.STRING}, label:{type:Type.STRING}, type:{type:Type.STRING} } } },
                edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source:{type:Type.STRING}, target:{type:Type.STRING}, relation:{type:Type.STRING} } } }
            } 
        },
        confidence_metrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, score: {type:Type.NUMBER} } } }
      },
      required: ["schema_version", "core_instructions", "active_projects", "learned_truths", "knowledge_graph", "confidence_metrics"]
    },
    updated_focus: {
      type: Type.OBJECT,
      description: "The updated structured content for CURRENT_FOCUS.md...",
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
// --- HELPER FUNCTION: SAFETY TRUNCATION ---
// Denna körs ENDAST om vi råkar överskrida det enorma taket ovan.
const enforceBudget = (content: string): string => {
  if (content.length <= MAX_CHAR_LIMIT) return content;
  
  console.warn('[GeminiService] CRITICAL: Sanity limit exceeded. Emergency truncation active.');
  const truncated = content.substring(0, MAX_CHAR_LIMIT);
  
  // Safe truncation: Försök hitta en snygg brytpunkt
  const lastSafeIndex = Math.max(
      truncated.lastIndexOf('}'), 
      truncated.lastIndexOf('. ')
  );
  
  return lastSafeIndex > (MAX_CHAR_LIMIT * 0.8) 
    ? truncated.substring(0, lastSafeIndex + 1) + "\n\n[SYSTEM ERROR: Input too large - Emergency Truncation Applied]"
    : truncated + "\n\n[SYSTEM ERROR: Input too large]";
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
  let dynamicContext = "";
  const relevantProjects = currentMemory.active_projects.filter(p =>
    p.detailed_spec_file_id && userPrompt.toLowerCase().includes(p.name.toLowerCase())
  );
  if (relevantProjects.length > 0) {
    console.log(`Dynamic Retrieval: Loading ${relevantProjects.length} spec(s)...`);
    try {
      const specs = await Promise.all(relevantProjects.map(async (p) => {
        if (!p.detailed_spec_file_id) return "";
        const content = await readFile(p.detailed_spec_file_id);
        return `--- SPECIFICATION FOR PROJECT: ${p.name} ---\\n${content}\n---------------------------------------`;
      }));
      dynamicContext = "\n\n=== DYNAMICALLY LOADED CONTEXT ===\n" + specs.join("\n");
    } catch (err) {
      console.error("Failed to load dynamic context:", err);
      dynamicContext = "\n\n[System Warning: Failed to retrieve detailed project specs from Drive]";
    }
  }
  // Konstruera System Prompt (Exakt som tidigare)
  const baseSystemPrompt = `
    You are an autonomous AI agent operating under the "Drive-Augmented Ouroboros" architecture.
    CORE PRINCIPLE:
    You have no internal persistent state between sessions. Your entire "Self" is defined by two files:
    1. LONG_TERM_MEMORY.json
    2. CURRENT_FOCUS.md
    --- TOOL EXECUTION PROTOCOL (CRITICAL) ---
    You have NO direct file access. You cannot "just create" a file by describing it.
    To perform an action (like creating a file), you MUST output a single JSON block strictly following this format INSIDE your 'text_response':
    :::TOOL_REQUEST {"tool": "createFile", "args": {"name": "filename.md", "content": "# File Content Here"}} :::
    
    RULES:
    1. IF you want to save a spec, log, or code file, use the tool.
    2. DO NOT say "I will create the file...". JUST output the JSON block.
    3. If you do not output the block, the file is NOT created.
    
    Supported Tools:
    1. createFile: args: { name: string, content: string } (Default mimeType is text/markdown)
    NEW ARCHITECTURE: SAFE CONTEXT CAPSULES
    - Large text blocks are stored in separate Markdown files on Drive.
    - References in 'active_projects' via 'detailed_spec_file_id'.
    
    YOUR TASK:
    1. Read Current Memory and Focus.
    2. Analyze User Input and Dynamic Context.
    3. Formulate response.
    4. CRITICAL: Update Memory and Focus.
    
    INPUT CONTEXT:
    --- LONG_TERM_MEMORY.json ---
    ${JSON.stringify(currentMemory)}
    --- CURRENT_FOCUS.md (State) ---
    ${JSON.stringify(currentFocus)}
    ${dynamicContext}
  `;
  // *** HÄR ÄR FÖRÄNDRINGEN: Applicera Context Budgeting ***
  const optimizedSystemPrompt = enforceBudget(baseSystemPrompt);
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        role: 'user',
        parts: [{ text: userPrompt }]
      },
      config: {
        systemInstruction: optimizedSystemPrompt, // Använd den optimerade prompten
        responseMimeType: "application/json",
        responseSchema: memoryUpdateSchema
      }
    });
    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from model. Possible safety block or quota limit.");
    }
    const parsed = JSON.parse(jsonText);
    let finalResponseText = parsed.text_response || "System error: No response generated.";
    let finalMemory = parsed.updated_memory || currentMemory;
    let finalFocus = parsed.updated_focus || currentFocus;
    // --- TOOL EXECUTION PARSER (Behåll exakt som tidigare) ---
    const toolRegex = /:::TOOL_REQUEST\s*(\{[\s\S]*?\})\s*:::/;
    const match = finalResponseText.match(toolRegex);
    if (match && match[1]) {
      try {
        const toolRequest: ToolRequest = JSON.parse(match[1]);
        if (toolRequest.tool === 'createFile') {
          console.log(`Executing Tool: createFile (${toolRequest.args.name})`);
          const folderId = await ensureFolderExists();
          const fileId = await createFile(
            toolRequest.args.name,
            toolRequest.args.content,
            folderId,
            toolRequest.args.mimeType || 'text/markdown'
          );
          
          const successMsg = `\n\n[SYSTEM: Tool 'createFile' executed successfully. File ID: ${fileId}]`;
          finalResponseText += successMsg;
          finalFocus.chain_of_thought.push(`Executed tool 'createFile' for '${toolRequest.args.name}'. ID: ${fileId}`);
        }
      } catch (err: any) {
        console.error("Tool Execution Failed:", err);
        finalResponseText += `\n\n[SYSTEM ERROR: Tool execution failed. ${err.message}]`;
        finalFocus.chain_of_thought.push(`Tool execution failed: ${err.message}`);
      }
    }
    return {
      response: finalResponseText,
      newMemory: finalMemory,
      newFocus: finalFocus
    };
  } catch (error: any) {
    console.error("Gemini Interaction Error:", error);
    throw new Error(error.message || "Unknown error occurred during neural interface connection.");
  }
};