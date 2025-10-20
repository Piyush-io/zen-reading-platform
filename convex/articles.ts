import { v } from "convex/values"
import { mutation, query, internalQuery, internalMutation } from "./_generated/server"

export const createArticle = mutation({
  args: {
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
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) throw new Error("User not found")

    const now = new Date().toISOString()

    const articleId = await ctx.db.insert("articles", {
      userId: user.clerkId,
      title: args.title,
      contentStorageId: args.contentStorageId,
      source: args.source,
      sourceUrl: args.sourceUrl,
      uploadFileId: args.uploadFileId,
      metadata: args.metadata,
      processingStatus: "completed",
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(user._id, {
      usage: {
        documentsProcessed: (user.usage?.documentsProcessed || 0) + 1,
        aiQueriesUsed: user.usage?.aiQueriesUsed || 0,
        resetDate: user.usage?.resetDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      },
    })

    return articleId
  },
})

export const getArticles = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) return []

    let articles = await ctx.db
      .query("articles")
      .withIndex("by_user_and_created", (q) => q.eq("userId", user.clerkId))
      .order("desc")
      .collect()

    if (args.search) {
      const searchLower = args.search.toLowerCase()
      articles = articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchLower) ||
          article.metadata?.author?.toLowerCase().includes(searchLower) ||
          article.metadata?.tags?.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
      )
    }

    const offset = args.offset || 0
    const limit = args.limit || 20

    return articles.slice(offset, offset + limit)
  },
})

export const getArticle = query({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const article = await ctx.db.get(args.id)
    
    if (!article) {
      return null
    }

    if (!identity) {
      if (article.isCurated) {
        return article
      }
      return null
    }

    if (article.isCurated) {
      return article
    }

    if (article.userId !== identity.subject) {
      return null
    }

    return article
  },
})

export const updateArticle = mutation({
  args: {
    id: v.id("articles"),
    title: v.optional(v.string()),
    contentStorageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.object({
      author: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      wordCount: v.optional(v.number()),
      estimatedReadingTime: v.optional(v.number()),
      images: v.optional(v.array(v.object({
        index: v.number(),
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const article = await ctx.db.get(args.id)
    if (!article) throw new Error("Article not found")

    if (article.userId !== identity.subject) {
      throw new Error("Unauthorized")
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.contentStorageId !== undefined) updates.contentStorageId = args.contentStorageId
    if (args.metadata !== undefined) updates.metadata = args.metadata

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

export const deleteArticle = mutation({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const article = await ctx.db.get(args.id)
    if (!article) throw new Error("Article not found")

    if (article.userId !== identity.subject) {
      throw new Error("Unauthorized")
    }

    await ctx.db.delete(args.id)

    const annotations = await ctx.db
      .query("annotations")
      .withIndex("by_article", (q) => q.eq("articleId", args.id))
      .collect()

    for (const annotation of annotations) {
      await ctx.db.delete(annotation._id)
    }

    const progressRecords = await ctx.db
      .query("readingProgress")
      .withIndex("by_article", (q) => q.eq("articleId", args.id))
      .collect()

    for (const progress of progressRecords) {
      await ctx.db.delete(progress._id)
    }

    const chatRecords = await ctx.db
      .query("aiChats")
      .withIndex("by_article", (q) => q.eq("articleId", args.id))
      .collect()

    for (const chat of chatRecords) {
      await ctx.db.delete(chat._id)
    }

    return { success: true }
  },
})

export const getArticleCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) return 0

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", user.clerkId))
      .collect()

    return articles.length
  },
})

export const getCuratedArticles = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_curated", (q) => q.eq("isCurated", true))
      .order("desc")
      .collect()

    const offset = args.offset || 0
    const limit = args.limit || 20

    return articles.slice(offset, offset + limit)
  },
})

export const getBrowseArticles = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    
    const curatedArticles = await ctx.db
      .query("articles")
      .withIndex("by_curated", (q) => q.eq("isCurated", true))
      .order("desc")
      .collect()

    let userArticles: typeof curatedArticles = []
    
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first()

      if (user) {
        const allUserArticles = await ctx.db
          .query("articles")
          .withIndex("by_user_and_created", (q) => q.eq("userId", user.clerkId))
          .order("desc")
          .collect()
        
        userArticles = allUserArticles.filter(article => !article.isCurated)
      }
    }

    let filteredCurated = curatedArticles
    let filteredUser = userArticles

    if (args.search) {
      const searchLower = args.search.toLowerCase()
      const filterFn = (article: typeof curatedArticles[0]) =>
        article.title.toLowerCase().includes(searchLower) ||
        article.metadata?.author?.toLowerCase().includes(searchLower) ||
        article.metadata?.tags?.some((tag: string) =>
          tag.toLowerCase().includes(searchLower)
        )
      
      filteredCurated = curatedArticles.filter(filterFn)
      filteredUser = userArticles.filter(filterFn)
    }

    return {
      curated: filteredCurated,
      user: filteredUser,
    }
  },
})

export const debugArticle = query({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id)
    const identity = await ctx.auth.getUserIdentity()
    
    return {
      article: article ? {
        _id: article._id,
        userId: article.userId,
        title: article.title,
        isCurated: article.isCurated,
      } : null,
      identity: identity ? {
        subject: identity.subject,
        email: identity.email,
      } : null,
    }
  },
})

export const getArticleByIdInternal = internalQuery({
  args: {
    id: v.id("articles"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

  export const updateArticleInternal = internalMutation({
    args: {
      id: v.id("articles"),
      updates: v.object({
        title: v.optional(v.string()),
        metadata: v.optional(v.any()),
        contentStorageId: v.optional(v.id("_storage")),
        processingProgress: v.optional(v.number()),
        processingStatus: v.optional(v.union(
          v.literal("pending"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("failed"),
        )),
        processingError: v.optional(v.string()),
        updatedAt: v.string(),
      }),
    },
    handler: async (ctx, args) => {
      const updates: any = { ...args.updates };
      if (updates.processingError === null || updates.processingError === undefined) {
        delete updates.processingError;
      }
      await ctx.db.patch(args.id, updates)
    },
  })

export const createArticleWithClerkId = mutation({
  args: {
    clerkId: v.string(),
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
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) throw new Error("User not found")

    const now = new Date().toISOString()

    const articleId = await ctx.db.insert("articles", {
      userId: user.clerkId,
      title: args.title,
      contentStorageId: args.contentStorageId,
      source: args.source,
      sourceUrl: args.sourceUrl,
      uploadFileId: args.uploadFileId,
      metadata: args.metadata,
      processingStatus: "completed",
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(user._id, {
      usage: {
        documentsProcessed: (user.usage?.documentsProcessed || 0) + 1,
        aiQueriesUsed: user.usage?.aiQueriesUsed || 0,
        resetDate: user.usage?.resetDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      },
    })

    return articleId
  },
})

// Curated article creation for admins/curators only
export const updateArticleWithClerkId = mutation({
  args: {
    clerkId: v.string(),
    id: v.id("articles"),
    title: v.optional(v.string()),
    contentStorageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.object({
      author: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      wordCount: v.optional(v.number()),
      estimatedReadingTime: v.optional(v.number()),
      images: v.optional(v.array(v.object({
        index: v.number(),
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) throw new Error("User not found")

    const article = await ctx.db.get(args.id)
    if (!article) throw new Error("Article not found")

    if (article.userId !== user.clerkId) {
      throw new Error("Unauthorized")
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.contentStorageId !== undefined) updates.contentStorageId = args.contentStorageId
    if (args.metadata !== undefined) updates.metadata = args.metadata

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

export const createCuratedArticle = mutation({
  args: {
    title: v.string(),
    contentStorageId: v.optional(v.id("_storage")),
    source: v.union(
      v.literal("upload"),
      v.literal("url"),
      v.literal("manual")
    ),
    sourceUrl: v.optional(v.string()),
    metadata: v.optional(v.object({
      author: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      wordCount: v.optional(v.number()),
      estimatedReadingTime: v.optional(v.number()),
      images: v.optional(v.array(v.object({
        index: v.number(),
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const now = new Date().toISOString()

    const articleId = await ctx.db.insert("articles", {
      userId: identity.subject,
      title: args.title,
      contentStorageId: args.contentStorageId,
      source: args.source,
      sourceUrl: args.sourceUrl,
      metadata: args.metadata,
      processingStatus: "completed",
      isCurated: true,
      curatedBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    })

    return articleId
  },
})

// Create an initial processing article for a user by Clerk ID
export const createProcessingArticleWithClerkId = mutation({
  args: {
    clerkId: v.string(),
    title: v.string(),
    source: v.union(
      v.literal("upload"),
      v.literal("url"),
      v.literal("manual")
    ),
    sourceUrl: v.optional(v.string()),
    uploadFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) throw new Error("User not found")

    const now = new Date().toISOString()

    const articleId = await ctx.db.insert("articles", {
      userId: user.clerkId,
      title: args.title,
      source: args.source,
      sourceUrl: args.sourceUrl,
      uploadFileId: args.uploadFileId,
      metadata: undefined,
      processingStatus: "processing",
      processingProgress: 0,
      createdAt: now,
      updatedAt: now,
    })

    return articleId
  },
})

export const updateProcessingWithClerkId = mutation({
  args: {
    clerkId: v.string(),
    id: v.id("articles"),
    title: v.optional(v.string()),
    contentStorageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.object({
      author: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      wordCount: v.optional(v.number()),
      estimatedReadingTime: v.optional(v.number()),
      images: v.optional(v.array(v.object({
        index: v.number(),
        storageId: v.id("_storage"),
        id: v.string(),
      }))),
    })),
    processingStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    processingProgress: v.optional(v.number()),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first()

    if (!user) throw new Error("User not found")

    const article = await ctx.db.get(args.id)
    if (!article) throw new Error("Article not found")
    if (article.userId !== user.clerkId) throw new Error("Unauthorized")

    const updates: any = { updatedAt: new Date().toISOString() }

    if (args.title !== undefined) updates.title = args.title
    if (args.contentStorageId !== undefined) updates.contentStorageId = args.contentStorageId
    if (args.metadata !== undefined) updates.metadata = args.metadata
    if (args.processingStatus !== undefined) updates.processingStatus = args.processingStatus
    if (args.processingProgress !== undefined) updates.processingProgress = args.processingProgress
    if (args.processingError !== undefined) updates.processingError = args.processingError

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})
