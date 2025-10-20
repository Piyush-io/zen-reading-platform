import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export const runtime = "nodejs"

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  const payload = await req.text()
  const headers = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  }

  let event: any

  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, headers)
  } catch (error) {
    console.error("Error verifying webhook:", error)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  const eventType = event.type

  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const subscription = event.data
    
    const tier = subscription.product_id === process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID
      ? "starter"
      : subscription.product_id === process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID
      ? "pro"
      : "free"

    const status = subscription.status === "active"
      ? "active"
      : subscription.status === "canceled"
      ? "canceled"
      : subscription.status === "past_due"
      ? "past_due"
      : subscription.status === "trialing"
      ? "trialing"
      : undefined

    try {
      await fetchMutation(api.users.updateSubscription, {
        email: subscription.customer_email,
        tier,
        status,
        polarCustomerId: subscription.customer_id,
        polarSubscriptionId: subscription.id,
      })
    } catch (error) {
      console.error("Error updating subscription:", error)
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      )
    }
  }

  if (eventType === "subscription.canceled") {
    const subscription = event.data

    try {
      await fetchMutation(api.users.updateSubscription, {
        email: subscription.customer_email,
        tier: "free",
        status: "canceled",
        polarCustomerId: subscription.customer_id,
        polarSubscriptionId: subscription.id,
      })
    } catch (error) {
      console.error("Error canceling subscription:", error)
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
