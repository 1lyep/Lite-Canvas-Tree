import { GoogleGenAI, Type } from "@google/genai";
import { NodeStatus, NodeType, WorkflowNode, Connection } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateWorkflow = async (prompt: string): Promise<{ nodes: WorkflowNode[], connections: Connection[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a workflow diagram structure for: "${prompt}". 
      
      Rules:
      1. Create a logical flow.
      2. Use 'start-end' for the first and last nodes.
      3. Use 'decision' for branching points (yes/no questions).
      4. Use 'milestone' for major phases.
      5. Use 'task' for regular steps.
      6. Space nodes using x (0-1000) and y (0-800).
      7. Connect them logically.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['todo', 'in-progress', 'done'] },
                  type: { type: Type.STRING, enum: ['task', 'milestone', 'decision', 'start-end'] },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                required: ['id', 'title', 'description', 'status', 'type', 'x', 'y']
              }
            },
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING },
                  to: { type: Type.STRING }
                },
                required: ['from', 'to']
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const data = JSON.parse(jsonText);
    
    // Map response to ensure types match perfectly
    const nodes: WorkflowNode[] = data.nodes.map((n: any) => ({
      ...n,
      width: 256, // Default width
      height: 160, // Default height
      status: n.status as NodeStatus,
      type: (n.type as NodeType) || NodeType.TASK
    }));

    const connections: Connection[] = data.connections.map((c: any) => ({
      id: `conn-${Math.random().toString(36).substr(2, 9)}`,
      from: c.from,
      to: c.to
    }));

    return { nodes, connections };

  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};