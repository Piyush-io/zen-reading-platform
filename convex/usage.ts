import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUserUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get article count
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user", (q: any) => q.eq("userId", identity.subject))
      .collect();

    // Get AI annotations count
    const aiAnnotations = await ctx.db
      .query("annotations")
      .withIndex("by_user", (q: any) => q.eq("userId", identity.subject))
      .filter((q: any) => q.eq(q.field("type"), "ai"))
      .collect();

    // Define quota limits based on tier
    const quotas = {
      free: {
        documents: 5,
        aiQueries: 25,
      },
      starter: {
        documents: 50,
        aiQueries: 500,
      },
      pro: {
        documents: -1, // unlimited
        aiQueries: -1, // unlimited
      },
    };

    const tier = user.subscriptionTier || "free";
    const quota = quotas[tier];

    return {
      tier,
      status: user.subscriptionStatus || "active",
      usage: {
        documentsProcessed: articles.length,
        aiQueriesUsed: aiAnnotations.length,
        resetDate: user.usage?.resetDate || new Date().toISOString(),
      },
      quota: {
        documents: quota.documents,
        aiQueries: quota.aiQueries,
      },
      canUpload: quota.documents === -1 || articles.length < quota.documents,
      canUseAI: quota.aiQueries === -1 || aiAnnotations.length < quota.aiQueries,
    };
  },
});

