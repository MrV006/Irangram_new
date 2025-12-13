
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";
import { CONFIG } from "../config";

// Initialize the Gemini AI client with the API key from environment variables.
let ai: GoogleGenAI | null = null;

try {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
        // Initialize Gemini AI
        // Note: System-level proxying or fetch patching is handled externally if needed.
        ai = new GoogleGenAI({ 
            apiKey: apiKey
        });
    } else {
        console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
} catch (error) {
    console.error("Failed to initialize Gemini AI:", error);
}

export const getGeminiResponse = async (
  contactId: string, 
  userMessage: string, 
  history: Message[]
): Promise<string> => {
  if (!ai) {
      return "سرویس هوش مصنوعی در حال حاضر فعال نیست (کلید API یافت نشد). لطفا با مدیر تماس بگیرید.";
  }

  try {
    // Format the conversation history for the model
    const conversationHistory = history
      .filter(m => m.type === 'text' && m.text)
      .slice(-20) // Limit to last 20 messages for context
      .map(m => `${m.senderId === 'me' ? 'User' : 'Model'}: ${m.text}`)
      .join('\n');

    const prompt = `${conversationHistory}\nUser: ${userMessage}\nModel:`;

    // Use gemini-2.5-flash for basic text chat tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, friendly, and intelligent AI assistant in a messenger app called IranGram. You should reply in Persian (Farsi). Keep your responses concise and conversational.",
      }
    });

    return response.text || "متاسفم، پاسخی دریافت نشد.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "سرویس هوش مصنوعی در حال حاضر در دسترس نیست (خطای اتصال). لطفا اتصال اینترنت خود را بررسی کنید.";
  }
};

export const clearChatSession = (contactId: string) => {
  // Stateless implementation, no cleanup needed
};
