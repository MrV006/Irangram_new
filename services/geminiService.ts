import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

// Initialize the Gemini AI client with the API key from environment variables.
// The API key must be obtained exclusively from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiResponse = async (
  contactId: string, 
  userMessage: string, 
  history: Message[]
): Promise<string> => {
  try {
    // Format the conversation history for the model
    // We filter for text messages and format them to provide context
    const conversationHistory = history
      .filter(m => m.type === 'text' && m.text)
      .slice(-20) // Limit to last 20 messages for context
      .map(m => `${m.senderId === 'me' ? 'User' : 'Model'}: ${m.text}`)
      .join('\n');

    const prompt = `${conversationHistory}\nUser: ${userMessage}\nModel:`;

    // Use gemini-2.5-flash for basic text chat tasks as per guidelines
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
    return "سرویس هوش مصنوعی در حال حاضر در دسترس نیست. لطفا بعدا تلاش کنید.";
  }
};

export const clearChatSession = (contactId: string) => {
  // Stateless implementation, no cleanup needed
};
