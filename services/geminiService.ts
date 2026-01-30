
import { GoogleGenAI, Type } from "@google/genai";
import { FormSchema } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private getFieldSchema() {
    return {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        type: { 
          type: Type.STRING, 
          description: "One of: text, textarea, number, select, checkbox, radio, date, email, tel, section" 
        },
        label: { type: Type.STRING },
        placeholder: { type: Type.STRING },
        required: { type: Type.BOOLEAN },
        helpText: { type: Type.STRING },
        isCollapsed: { type: Type.BOOLEAN },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ["label", "value"]
          }
        },
        children: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              label: { type: Type.STRING },
              placeholder: { type: Type.STRING },
              required: { type: Type.BOOLEAN },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["id", "type", "label"]
          }
        }
      },
      required: ["id", "type", "label", "required"]
    };
  }

  async generateFormFromPrompt(prompt: string): Promise<FormSchema> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a complete form schema JSON for: ${prompt}`,
      config: {
        systemInstruction: "You are a professional UX engineer. Create a functional, accessible form schema. Use 'section' type to group related fields for better user experience. Sections contain 'children'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            submitButtonText: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: this.getFieldSchema()
            }
          },
          required: ["title", "description", "fields", "submitButtonText"]
        }
      }
    });

    return this.parseResponse(response.text);
  }

  async generateFormFromPDF(base64Data: string): Promise<FormSchema> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf"
            }
          },
          {
            text: "Extract all form elements from this PDF. Group related fields into logical sections using the 'section' type. Identify labels, logical field types, and any multiple choice options."
          }
        ]
      },
      config: {
        systemInstruction: "You are an elite Document Digitization Assistant. Analyze the PDF and convert it into a digital form schema using hierarchical sections to mirror the document's original structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            submitButtonText: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: this.getFieldSchema()
            }
          },
          required: ["title", "description", "fields", "submitButtonText"]
        }
      }
    });

    return this.parseResponse(response.text);
  }

  private parseResponse(text: string | undefined): FormSchema {
    try {
      const cleanedText = text?.trim() || '{}';
      return JSON.parse(cleanedText) as FormSchema;
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("The AI generated an invalid schema structure. Please try again with a clearer prompt or document.");
    }
  }
}
