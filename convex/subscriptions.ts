import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const createCheckoutSession = mutation({
  args: {
    priceId: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return {
      checkoutUrl: `https://polar.sh/checkout?product=${args.productId}&price=${args.priceId}`,
      customerId: user.polarCustomerId,
    }
  },
})

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) {
      return null
    }

    return {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      polarSubscriptionId: user.polarSubscriptionId,
    }
  },
})

export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    if (!user.polarSubscriptionId) {
      throw new Error("No active subscription")
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "canceled",
      subscriptionTier: "free",
    })

    return {
      success: true,
      message: "Subscription canceled successfully",
      subscriptionId: user.polarSubscriptionId,
    }
  },
})
