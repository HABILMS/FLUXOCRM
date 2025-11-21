
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
          description: 'Navigate to a specific page in the application',
          parameters: {
            type: Type.OBJECT,
            properties: {
              page: {
                type: Type.STRING,
                description: 'The page to navigate to. Options: "dashboard", "contacts", "opportunities", "expenses", "activities"',
              },
            },
            required: ['page'],
          },
        },
        {
            name: 'create_expense',
            description: 'Record a new outgoing expense (money spent)',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'What was purchased (e.g., "Lunch")' },
                    amount: { type: Type.NUMBER, description: 'The numeric cost amount' },
                    category: { type: Type.STRING, description: 'Category (e.g., Food, Transport, Office)' }
                },
                required: ['description', 'amount']
            }
        },
        {
            name: 'create_income',
            description: 'Record a new income or revenue (money received)',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'Source of income (e.g., "Project Sale", "Consulting")' },
                    amount: { type: Type.NUMBER, description: 'The numeric amount received' },
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
    if (!ai) return "Erro: Chave de API não configurada. Adicione sua chave nas configurações.";

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
        return finalResponse.text || "Ação realizada.";
      }

      return result.text || "Não entendi, pode repetir?";
      
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Desculpe, ocorreu um erro ao processar sua solicitação.";
    }
  }
}

export const geminiService = new GeminiService();
