"use client"

import type React from "react"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { Upload, Library, Key, Eye, EyeOff, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Navigation } from "@/components/navigation"
import { UsageDashboard } from "@/components/usage-dashboard"

const TIER_LIMITS = {
  free: { documents: 10, aiQueries: 50 },
  starter: { documents: 100, aiQueries: 1000 },
  pro: { documents: Infinity, aiQueries: Infinity },
}

type Tier = keyof typeof TIER_LIMITS

function clamp100(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export default function DashboardPage() {
  const { user: clerkUser } = useUser()
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  )
  const updateApiKeys = useMutation(api.users.updateApiKeys)

  const [mistralKey, setMistralKey] = useState("")
  const [groqKey, setGroqKey] = useState("")
  const [showMistralKey, setShowMistralKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  if (!clerkUser) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground font-light">
            Please sign in to view your dashboard
          </p>
        </div>
      </>
    )
  }

  if (user === undefined) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground font-light">Loading...</p>
        </div>
      </>
    )
  }

  if (user === null) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground font-light">User not found</p>
        </div>
      </>
    )
  }

  const tier = user.subscriptionTier as Tier
  const limits = TIER_LIMITS[tier]
  const usage = user.usage || {
    documentsProcessed: 0,
    aiQueriesUsed: 0,
    resetDate: new Date().toISOString(),
  }
  const hasApiKeys = Boolean(user.apiKeys?.mistralKey && user.apiKeys?.groqKey)

  const docUsagePercent =
    tier === "free" || tier === "starter"
      ? clamp100((usage.documentsProcessed / limits.documents) * 100)
      : 0
  const aiUsagePercent =
    tier === "free" || tier === "starter"
      ? clamp100((usage.aiQueriesUsed / limits.aiQueries) * 100)
      : 0

  const handleSaveApiKeys = async () => {
    if (!mistralKey || !groqKey || !clerkUser?.id) {
      toast.error("Please enter both API keys")
      return
    }

    setIsSaving(true)
    try {
      await updateApiKeys({
        clerkId: clerkUser.id,
        mistralKey,
        groqKey,
      })
      toast.success("API keys saved successfully")
      setMistralKey("")
      setGroqKey("")
    } catch (error) {
      console.error("Failed to save API keys:", error)
      toast.error("Failed to save API keys")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="mb-12">
            <h1 className="text-4xl font-light tracking-tight mb-2">
              {clerkUser.firstName ? `Welcome back, ${clerkUser.firstName}` : "Dashboard"}
            </h1>
            <p className="text-muted-foreground font-light">
              {user.email} · <span className="capitalize">{tier}</span> tier
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
                Usage
              </h2>
              <UsageDashboard />
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ActionButton href="/upload" icon={<Upload className="size-5" />}>
                  Upload New Document
                </ActionButton>
                <ActionButton href="/browse" icon={<Library className="size-5" />}>
                  Browse Library
                </ActionButton>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
                  API Keys
                </h2>
                {hasApiKeys && (
                  <span className="text-xs text-green-500 font-light">Configured</span>
                )}
              </div>
              <div className="space-y-4 rounded-lg border border-border/60 p-6">
                <p className="text-sm text-muted-foreground font-light">
                  Bring your own keys (BYOK) to process documents and use AI features
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mistral" className="text-xs font-light text-muted-foreground">
                      Mistral API Key
                      <a
                        href="https://console.mistral.ai/api-keys/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      >
                        Get Key <ExternalLink className="ml-1 size-3" />
                      </a>
                    </Label>
                    <div className="relative">
                      <Input
                        id="mistral"
                        type={showMistralKey ? "text" : "password"}
                        value={mistralKey}
                        onChange={(e) => setMistralKey(e.target.value)}
                        placeholder={hasApiKeys ? "••••••••••••••••" : "Enter Mistral API key"}
                        className="pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMistralKey(!showMistralKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showMistralKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groq" className="text-xs font-light text-muted-foreground">
                      Groq API Key
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      >
                        Get Key <ExternalLink className="ml-1 size-3" />
                      </a>
                    </Label>
                    <div className="relative">
                      <Input
                        id="groq"
                        type={showGroqKey ? "text" : "password"}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        placeholder={hasApiKeys ? "••••••••••••••••" : "Enter Groq API key"}
                        className="pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showGroqKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveApiKeys}
                  disabled={isSaving || (!mistralKey && !groqKey)}
                  size="sm"
                  className="w-full"
                >
                  <Key className="size-4" />
                  {isSaving ? "Saving..." : "Save API Keys"}
                </Button>

                <p className="text-xs text-muted-foreground font-light">
                  Your keys are encrypted and only used for your documents and AI queries.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

function UsageCard({
  label,
  current,
  limit,
  percent,
}: {
  label: string
  current: number
  limit: number | null
  percent: number
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-light text-muted-foreground">{label}</span>
        <span className="text-sm font-light">
          {current}
          {limit !== null && ` / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <>
          <Progress value={percent} className="mb-1" />
          <p className="text-xs text-muted-foreground">{Math.round(percent)}%</p>
        </>
      )}
      {limit === null && <p className="text-xs text-muted-foreground">Unlimited</p>}
    </div>
  )
}

function ActionButton({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border/60 p-4 transition-colors hover:border-foreground/40 hover:bg-accent/30"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="font-light">{children}</span>
    </Link>
  )
}
