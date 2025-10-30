import { action } from "./_generated/server";
import { v } from "convex/values";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory cache for AI explanations (will persist for lifetime of the action)
const explanationCache = new Map<string, any>();

// Generate all three explanations in one API call for efficiency
export const generateCombinedExplanation = action({
  args: {
    text: v.string(),
  },
  handler: async (_, args) => {
    const { text } = args;

    // Create cache key from text
    const cacheKey = `combined:${text.slice(0, 200)}`;
    
    // Check cache first
    if (explanationCache.has(cacheKey)) {
      return explanationCache.get(cacheKey);
    }

    const prompt = `You are an expert at making complex text accessible. For the following text, provide three different explanations in valid JSON format:

1. "eli5" - Explain as if to a 5-year-old (2-3 sentences max)
2. "summary" - A brief, professional summary (1-2 sentences)
3. "jargon" - Rewrite without jargon or technical terms, accessible to general audience (2-3 sentences max)

Text to explain:
${text}

Respond ONLY with valid JSON in this exact format:
{
  "eli5": "...",
  "summary": "...",
  "jargon": "..."
}`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that always responds with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      
      // Cache the result
      explanationCache.set(cacheKey, parsed);
      
      // Limit cache size to prevent memory issues
      if (explanationCache.size > 100) {
        const firstKey = explanationCache.keys().next().value;
        explanationCache.delete(firstKey);
      }

      return parsed;
    } catch (error) {
      console.error("Error generating combined explanation:", error);
      throw new Error("Failed to generate explanation");
    }
  },
});

// Legacy single explanation generator (kept for backwards compatibility)
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

    // Check cache
    const cacheKey = `${type}:${text.slice(0, 200)}`;
    if (explanationCache.has(cacheKey)) {
      return { explanation: explanationCache.get(cacheKey) };
    }

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
      
      // Cache result
      explanationCache.set(cacheKey, explanation);
      
      // Limit cache size
      if (explanationCache.size > 100) {
        const firstKey = explanationCache.keys().next().value;
        explanationCache.delete(firstKey);
      }

      return { explanation };
    } catch (error) {
      console.error("Error generating explanation:", error);
      throw new Error("Failed to generate explanation");
    }
  },
});
