import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "mock-key",
});

export async function generateContent(systemPrompt: string, userPrompt: string) {
  if (process.env.GROQ_API_KEY === "mock" || !process.env.GROQ_API_KEY) {
     return `<!-- SUBJECT: Mock Subject --> <!-- PREVIEW: Mock Preview --> <html><body><h1>Mock Content (Groq)</h1><p>System: ${systemPrompt.substring(0, 50)}...</p><p>User: ${userPrompt.substring(0, 50)}...</p></body></html>`;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error("Failed to generate content via Groq API");
  }
}
