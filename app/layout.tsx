import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Crimson_Pro, Architects_Daughter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { Suspense } from "react"
import { ConvexClientProvider } from "./providers/convex-provider"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { OnboardingTour } from "@/components/onboarding-tour"
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://serene.app'),
  title: {
    default: "Serene — Transform PDFs into Beautiful Reading Experiences",
    template: "%s | Serene",
  },
  description: "A calm reading platform that transforms PDFs into distraction-free, annotatable experiences with AI-powered insights. Upload documents, highlight, take notes, and get instant explanations.",
  keywords: [
    "PDF reader",
    "distraction-free reading",
    "document annotation",
    "AI explanations",
    "reading platform",
    "PDF to markdown",
    "knowledge management",
    "digital reading",
    "note-taking",
    "study tool"
  ],
  authors: [{ name: "Serene" }],
  creator: "Serene",
  publisher: "Serene",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Serene — Transform PDFs into Beautiful Reading Experiences",
    description: "Upload PDFs, annotate with AI-powered insights, and enjoy distraction-free reading. The calm reading platform for knowledge workers.",
    siteName: "Serene",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Serene - Calm Reading Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Serene — Transform PDFs into Beautiful Reading Experiences",
    description: "Upload PDFs, annotate with AI-powered insights, and enjoy distraction-free reading.",
    images: ["/og-image.png"],
    creator: "@serene_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
  manifest: "/manifest.json",
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
          <ErrorBoundary>
            <ConvexClientProvider>
              <Suspense fallback={null}>{children}</Suspense>
              <Toaster />
              <Analytics />
              <KeyboardShortcuts />
              <OnboardingTour />
            </ConvexClientProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
