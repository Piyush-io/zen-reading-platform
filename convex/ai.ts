import { action } from "./_generated/server";
import { v } from "convex/values";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateExplanation = action({
  args: {
    text: v.string(),
    type: v.union(
      v.literal("eli5"),
      v.literal("summary"),
      v.literal("jargon")
    ),
  },
  handler: async (_, args) => {
    const { text, type } = args;

    const prompts = {
      eli5: `Explain the following text as if I'm 5 years old. Be concise (2-3 sentences max):

${text}`,
      summary: `Provide a brief summary of the following text in 1-2 sentences:

${text}`,
      jargon: `Rewrite the following text without jargon or technical terms. Make it accessible to a general audience (2-3 sentences max):

${text}`,
    };

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompts[type],
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const explanation = completion.choices[0]?.message?.content || "";
      return { explanation };
    } catch (error) {
      console.error("Error generating explanation:", error);
      throw new Error("Failed to generate explanation");
    }
  },
});
