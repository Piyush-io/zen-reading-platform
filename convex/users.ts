import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: new Date().toISOString(),
      })
      return existingUser._id
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      subscriptionTier: "free",
      usage: {
        documentsProcessed: 0,
        aiQueriesUsed: 0,
        resetDate: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return userId
  },
})

export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()
  },
})

export const getUserApiKeys = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    return user?.apiKeys
  },
})

export const updateApiKeys = mutation({
  args: {
    clerkId: v.string(),
    mistralKey: v.optional(v.string()),
    groqKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    await ctx.db.patch(user._id, {
      apiKeys: {
        mistralKey: args.mistralKey,
        groqKey: args.groqKey,
      },
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

export const updateSubscription = mutation({
  args: {
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
    tier: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    )),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = null as any

    if (args.clerkId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId!))
        .first()
    } else if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first()
    }

    if (!user) {
      throw new Error("User not found")
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: args.tier,
      subscriptionStatus: args.status,
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
      updatedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

export const incrementUsage = mutation({
  args: {
    clerkId: v.string(),
    type: v.union(v.literal("document"), v.literal("aiQuery")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    const now = new Date()
    const resetDate = user.usage?.resetDate ? new Date(user.usage.resetDate) : now
    
    const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                       now.getFullYear() !== resetDate.getFullYear()

    const currentUsage = shouldReset ? {
      documentsProcessed: 0,
      aiQueriesUsed: 0,
      resetDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    } : user.usage || {
      documentsProcessed: 0,
      aiQueriesUsed: 0,
      resetDate: now.toISOString(),
    }

    await ctx.db.patch(user._id, {
      usage: {
        documentsProcessed: args.type === "document" 
          ? currentUsage.documentsProcessed + 1 
          : currentUsage.documentsProcessed,
        aiQueriesUsed: args.type === "aiQuery" 
          ? currentUsage.aiQueriesUsed + 1 
          : currentUsage.aiQueriesUsed,
        resetDate: currentUsage.resetDate,
      },
      updatedAt: now.toISOString(),
    })

    return { success: true }
  },
})
