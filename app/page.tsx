"use client";

import { Navigation } from "@/components/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        router.push("/browse");
      } else if (e.key === "u" || e.key === "U") {
        router.push("/upload");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <section className="flex-1 grid place-items-center px-6 py-24">
        <div className="grid max-w-6xl gap-16 text-center">
          <div className="space-y-6">
            <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground/70">
              Read without distraction
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light leading-tight">
              A calm reading room for the internet&apos;s best writing
            </h1>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Link
              href="/browse"
              className="group rounded-3xl border border-border/60 bg-background/80 p-10 text-left shadow-sm transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>Explore library</span>
                <span className="font-mono text-muted-foreground/70">E</span>
              </div>
              <h2 className="mt-6 text-3xl font-light leading-snug transition-colors group-hover:text-foreground">
                Browse curated collections and your saved articles
              </h2>
              <span className="mt-8 inline-flex items-center text-sm font-medium text-primary">
                Enter the library →
              </span>
            </Link>

            <Link
              href="/upload"
              className="group rounded-3xl border border-border/60 bg-background/80 p-10 text-left shadow-sm transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>Import instantly</span>
                <span className="font-mono text-muted-foreground/70">U</span>
              </div>
              <h2 className="mt-6 text-3xl font-light leading-snug transition-colors group-hover:text-foreground">
                Upload PDFs and turn them into beautiful markdown
              </h2>
              <span className="mt-8 inline-flex items-center text-sm font-medium text-primary">
                Queue a document →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
