import { v } from "convex/values"
import { action, query, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

export const writeArticleContent = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const blob = new Blob([args.content], { type: "text/plain" })
    const storageId = await ctx.storage.store(blob)
    return storageId
  },
})

export const writeArticleContentInternal = internalAction({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const blob = new Blob([args.content], { type: "text/plain" })
    const storageId = await ctx.storage.store(blob)
    return storageId
  },
})

export const updateArticleContent = action({
  args: {
    storageId: v.id("_storage"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
    
    const blob = new Blob([args.content], { type: "text/plain" })
    const newStorageId = await ctx.storage.store(blob)
    return newStorageId
  },
})

export const updateArticleContentInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
    
    const blob = new Blob([args.content], { type: "text/plain" })
    const newStorageId = await ctx.storage.store(blob)
    return newStorageId
  },
})

export const readArticleContent = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId)
    return url
  },
})

export const getArticleContentUrl = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId)
    return url
  },
})

export const deleteArticleContent = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
  },
})

export const deleteArticleContentInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
  },
})

export const uploadImage = action({
  args: {
    base64: v.string(),
  },
  handler: async (ctx, args) => {
    const base64Data = args.base64.replace(/^data:image\/\w+;base64,/, "")
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: "image/png" })
    const storageId = await ctx.storage.store(blob)
    return storageId
  },
})

export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId)
    return url
  },
})

export const getImageUrls = query({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (id) => {
        const url = await ctx.storage.getUrl(id)
        return url
      })
    )
    return urls
  },
})
