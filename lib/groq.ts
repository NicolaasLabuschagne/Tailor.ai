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
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error("Failed to generate content via Groq API");
  }
}

// Same as generateContent but forces a JSON object response and parses it.
export async function generateJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  reasoningEffort: "low" | "medium" | "high" = "low"
): Promise<T> {
  if (process.env.GROQ_API_KEY === "mock" || !process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      reasoning_effort: reasoningEffort,
      temperature,
    });

    return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error("Failed to generate JSON via Groq API");
  }
}
