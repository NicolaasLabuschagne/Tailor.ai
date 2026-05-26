import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key");

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function generateContent(systemPrompt: string, userPrompt: string) {
  if (process.env.GEMINI_API_KEY === "mock" || !process.env.GEMINI_API_KEY) {
     return `<!-- SUBJECT: Mock Subject --> <!-- PREVIEW: Mock Preview --> <html><body><h1>Mock Content</h1><p>System: ${systemPrompt.substring(0, 50)}...</p><p>User: ${userPrompt.substring(0, 50)}...</p></body></html>`;
  }

  try {
    const result = await geminiModel.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `SYSTEM: ${systemPrompt}\n\nUSER: ${userPrompt}` }] }
      ],
    });
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content via Gemini API");
  }
}
