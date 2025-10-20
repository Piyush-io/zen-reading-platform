import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    subscriptionTier: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
    subscriptionStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    )),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    apiKeys: v.optional(v.object({
      mistralKey: v.optional(v.string()),
      groqKey: v.optional(v.string()),
    })),
    usage: v.optional(v.object({
      documentsProcessed: v.number(),
      aiQueriesUsed: v.number(),
      resetDate: v.string(),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  articles: defineTable({
    userId: v.string(),
    title: v.string(),
    contentStorageId: v.optional(v.id("_storage")),
    source: v.union(
      v.literal("upload"),
      v.literal("url"),
      v.literal("manual")
    ),
    sourceUrl: v.optional(v.string()),
    uploadFileId: v.optional(v.string()),
    metadata: v.optional(v.object({
      author: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      wordCount: v.optional(v.number()),
      estimatedReadingTime: v.optional(v.number()),
      images: v.optional(v.array(v.object({
        index: v.number(),
        id: v.string(),
        base64: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
      }))),
    })),
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processingProgress: v.optional(v.number()),
    processingError: v.optional(v.string()),
    isCurated: v.optional(v.boolean()),
    curatedBy: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["processingStatus"])
    .index("by_user_and_created", ["userId", "createdAt"])
    .index("by_curated", ["isCurated"]),

  annotations: defineTable({
    articleId: v.id("articles"),
    userId: v.string(),
    type: v.union(
      v.literal("note"),
      v.literal("ai")
    ),
    startOffset: v.number(),
    endOffset: v.number(),
    selectedText: v.string(),
    highlightId: v.string(),
    highlightPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    notePosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    noteContent: v.optional(v.string()),
    aiExplanation: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_article", ["articleId"])
    .index("by_user", ["userId"])
    .index("by_article_and_user", ["articleId", "userId"]),

  readingProgress: defineTable({
    articleId: v.id("articles"),
    userId: v.string(),
    progressPercentage: v.number(),
    lastReadPosition: v.number(),
    timeSpentSeconds: v.number(),
    isCompleted: v.boolean(),
    lastReadAt: v.string(),
  })
    .index("by_article", ["articleId"])
    .index("by_user", ["userId"])
    .index("by_article_and_user", ["articleId", "userId"]),

  aiChats: defineTable({
    articleId: v.id("articles"),
    userId: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.string(),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_article", ["articleId"])
    .index("by_user", ["userId"])
    .index("by_article_and_user", ["articleId", "userId"]),
})
