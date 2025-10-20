import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Crimson_Pro, Architects_Daughter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { Suspense } from "react"
import { ConvexClientProvider } from "./providers/convex-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-crimson",
  display: "swap",
})

const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-handwriting",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Serene — Read Without Distraction",
  description: "A minimalist platform for reading articles, books, and blogs in a clean, ad-free environment.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`font-sans ${ibmPlexMono.variable} ${crimsonPro.variable} ${architectsDaughter.variable}`}>
          <ConvexClientProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster />
            <Analytics />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
