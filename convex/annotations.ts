import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAnnotations = query({
  args: {
    articleId: v.id("articles"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const annotations = await ctx.db
      .query("annotations")
      .withIndex("by_article_and_user", (q) =>
        q.eq("articleId", args.articleId).eq("userId", args.userId)
      )
      .collect();

    return annotations;
  },
});

export const createAnnotation = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.string(),
    type: v.union(v.literal("note"), v.literal("ai")),
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
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const annotationId = await ctx.db.insert("annotations", {
      articleId: args.articleId,
      userId: args.userId,
      type: args.type,
      startOffset: args.startOffset,
      endOffset: args.endOffset,
      selectedText: args.selectedText,
      highlightId: args.highlightId,
      highlightPosition: args.highlightPosition,
      notePosition: args.notePosition,
      noteContent: args.noteContent,
      aiExplanation: args.aiExplanation,
      createdAt: now,
      updatedAt: now,
    });

    return annotationId;
  },
});

export const updateAnnotation = mutation({
  args: {
    id: v.id("annotations"),
    noteContent: v.optional(v.string()),
    aiExplanation: v.optional(v.string()),
    notePosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
  },
});

export const deleteAnnotation = mutation({
  args: {
    id: v.id("annotations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
