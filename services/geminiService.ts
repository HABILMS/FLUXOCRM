
import { GoogleGenAI, Type, FunctionDeclaration, FunctionCall } from "@google/genai";
import { OpportunityStatus } from "../types";
import { StorageService } from "./storage";
import { supabase } from "./supabase";

export class GeminiService {
  private modelId = 'gemini-2.5-flash';

  constructor() {}

  private async getApiKey(): Promise<string> {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
          const settings = await StorageService.getUserSettings(data.session.user.id);
          if (settings.googleApiKey) return settings.googleApiKey;
      }
      return process.env.API_KEY || '';
  }

  private async getAi(): Promise<GoogleGenAI | null> {
      const key = await this.getApiKey();
      return key ? new GoogleGenAI({ apiKey: key }) : null;
  }

  async isAvailable() {
    return !!(await this.getApiKey());
  }

  // Tools Definition
  private getTools(): { functionDeclarations: FunctionDeclaration[] }[] {
    return [{
      functionDeclarations: [
        {
          name: 'navigate',
          description: 'Navigate to a specific page within the CRM application. Use when user asks to "go to", "show me", or "open" a section.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              page: {
                type: Type.STRING,
                description: 'The page to navigate to. Valid options: "dashboard", "contacts", "opportunities", "expenses", "activities", "admin"',
              },
            },
            required: ['page'],
          },
        },
        {
            name: 'create_expense',
            description: 'Record a new financial expense (money spent/outgoing). Use when user says "spent", "bought", "cost me", "paid".',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'A short description of the expense (e.g., "Lunch", "Uber", "Server cost")' },
                    amount: { type: Type.NUMBER, description: 'The numeric monetary value (positive number)' },
                    category: { type: Type.STRING, description: 'Category (e.g., Food, Transport, Office, Marketing)' }
                },
                required: ['description', 'amount']
            }
        },
        {
            name: 'create_income',
            description: 'Record a new financial income/revenue (money received). Use when user says "received", "sold", "earned", "invoice paid".',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'Source of income (e.g., "Consulting", "Project X", "Sale")' },
                    amount: { type: Type.NUMBER, description: 'The numeric monetary value (positive number)' },
                    category: { type: Type.STRING, description: 'Category (e.g., Sales, Services, Salary)' }
                },
                required: ['description', 'amount']
            }
        }
      ],
    }];
  }

  async sendMessage(
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    systemInstruction: string,
    onToolCall?: (call: FunctionCall) => Promise<any>
  ): Promise<string> {
    const ai = await this.getAi();
    if (!ai) return "Erro: Chave de API não configurada. Adicione sua chave nas configurações para usar a IA.";

    try {
      // Convert simplified history to format
      const chat = ai.chats.create({
        model: this.modelId,
        config: {
            systemInstruction,
            tools: this.getTools(),
        },
        history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }))
      });

      const result = await chat.sendMessage({ message: newMessage });
      
      // Handle Tool Calls
      const toolCalls = result.candidates?.[0]?.content?.parts?.filter(p => !!p.functionCall).map(p => p.functionCall);
      
      if (toolCalls && toolCalls.length > 0 && onToolCall) {
        const responseParts = [];
        for (const call of toolCalls) {
            if(call) {
                const functionResult = await onToolCall(call);
                // Correctly structure the tool response part
                responseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: { result: functionResult },
                        id: call.id
                    }
                });
            }
        }
        // Send tool response back to model to get final text.
        const finalResponse = await chat.sendMessage({ message: responseParts });
        return finalResponse.text || "Ação realizada com sucesso.";
      }

      return result.text || "Não entendi, pode repetir de outra forma?";
      
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Desculpe, ocorreu um erro de conexão com a IA. Tente novamente em instantes.";
    }
  }
}

export const geminiService = new GeminiService();
