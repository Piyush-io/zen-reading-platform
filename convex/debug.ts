import { v } from "convex/values"
import { query } from "./_generated/server"

export const inspectArticleContent = query({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId)
    
    if (!article) {
      return { error: "Article not found" }
    }

    if (!article.contentStorageId) {
      return { error: "No content storage ID" }
    }

    const url = await ctx.storage.getUrl(article.contentStorageId)
    
    return {
      articleId: article._id,
      title: article.title,
      storageUrl: url,
      processingStatus: article.processingStatus,
      wordCount: article.metadata?.wordCount,
    }
  },
})
