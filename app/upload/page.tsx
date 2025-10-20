"use client"

import { Navigation } from "@/components/navigation"
import { UploadForm } from "@/components/upload-form"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"

export default function UploadPage() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        router.back()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-32 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">Upload</h1>
            <p className="text-sm font-light text-muted-foreground leading-relaxed">
              Share your knowledge with the community
            </p>
          </div>
          <SignedIn>
            <UploadForm />
          </SignedIn>
          <SignedOut>
            <div className="text-center">
              <p className="text-sm font-light text-muted-foreground mb-6">
                Please sign in to upload content
              </p>
              <SignInButton mode="modal">
                <button className="px-6 py-2 text-sm font-light bg-foreground text-background hover:bg-foreground/90 transition-colors">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </div>
    </main>
  )
}
