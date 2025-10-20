"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

const PLANS = [
  {
    name: "Free",
    tier: "free" as const,
    price: "$0",
    description: "Perfect for trying out Serene with your own API keys",
    features: [
      "Bring Your Own API Keys (BYOK)",
      "10 documents per month",
      "50 AI queries per month",
      "Unlimited reading time",
      "Text annotations & highlights",
      "Reading progress tracking",
    ],
    limitations: [
      "Requires Mistral & Groq API keys",
      "Limited usage quotas",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    name: "Starter",
    tier: "starter" as const,
    price: "$9",
    description: "Great for regular readers who want managed infrastructure",
    features: [
      "Managed API access (no BYOK needed)",
      "100 documents per month",
      "1,000 AI queries per month",
      "Unlimited reading time",
      "Text annotations & highlights",
      "Reading progress tracking",
      "Priority support",
    ],
    limitations: [],
    cta: "Upgrade to Starter",
    popular: false,
  },
  {
    name: "Pro",
    tier: "pro" as const,
    price: "$19",
    description: "For power users who need unlimited access",
    features: [
      "Managed API access (no BYOK needed)",
      "Unlimited documents",
      "Unlimited AI queries",
      "Unlimited reading time",
      "Text annotations & highlights",
      "Reading progress tracking",
      "Priority support",
      "Early access to new features",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true,
  },
]

export default function PricingPage() {
  const { user: clerkUser } = useUser()
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  )
  const createCheckout = useMutation(api.subscriptions.createCheckoutSession)
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleUpgrade = async (tier: "starter" | "pro") => {
    if (!clerkUser) {
      window.location.href = "/sign-in"
      return
    }

    setLoadingTier(tier)

    const productId = tier === "starter"
      ? process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID
      : process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID

    const priceId = tier === "starter"
      ? process.env.NEXT_PUBLIC_POLAR_STARTER_PRICE_ID
      : process.env.NEXT_PUBLIC_POLAR_PRO_PRICE_ID

    if (!productId || !priceId) {
      console.error("Polar product/price IDs not configured")
      setLoadingTier(null)
      return
    }

    try {
      const result = await createCheckout({
        productId,
        priceId,
      })

      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error("Failed to create checkout session:", error)
      toast.error("Failed to create checkout session. Please try again.")
      setLoadingTier(null)
    }
  }

  const currentTier = user?.subscriptionTier || "free"

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light tracking-wide mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground font-light text-lg">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier
            const isDisabled = isCurrent || loadingTier !== null

            return (
              <Card
                key={plan.tier}
                className={`relative ${
                  plan.popular
                    ? "border-2 border-primary shadow-lg"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Sparkles className="mr-1 h-3 w-3 inline" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl font-light">{plan.name}</CardTitle>
                    {isCurrent && (
                      <Badge variant="outline">Current</Badge>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-light">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="font-light">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="mr-2 h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-light">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <div className="mb-6 p-3 bg-muted rounded-md">
                      <p className="text-xs font-light text-muted-foreground mb-2">
                        Limitations:
                      </p>
                      <ul className="space-y-1">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="text-xs font-light text-muted-foreground">
                            • {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.tier === "free" ? (
                    isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Link href="/dashboard">
                        <Button className="w-full" variant="outline">
                          Add API Keys
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={isDisabled}
                      onClick={() => handleUpgrade(plan.tier)}
                    >
                      {loadingTier === plan.tier
                        ? "Loading..."
                        : isCurrent
                        ? "Current Plan"
                        : plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-light">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">What is BYOK (Bring Your Own Keys)?</h3>
                <p className="text-sm text-muted-foreground font-light">
                  BYOK allows you to use your own API keys from Mistral AI and Groq. This means you
                  pay those providers directly for API usage, and Serene remains free. Great for
                  developers and power users who already have API access.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">Can I switch plans later?</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect at
                  the start of your next billing cycle.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">What payment methods do you accept?</h3>
                <p className="text-sm text-muted-foreground font-light">
                  We accept all major credit cards through our payment processor, Polar.sh. All
                  transactions are secure and encrypted.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">What happens if I exceed my quota?</h3>
                <p className="text-sm text-muted-foreground font-light">
                  On the Free and Starter plans, you'll be notified when approaching your limits.
                  Once exceeded, you can either upgrade or wait for your monthly reset. Pro users
                  have unlimited access.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">Can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Yes, you can cancel your subscription at any time. You'll continue to have access
                  until the end of your current billing period.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
