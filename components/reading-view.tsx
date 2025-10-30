"use client";

import { ChevronLeft, X, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense, lazy } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

// Lazy load heavy components
const TextAnnotation = lazy(() => import("./text-annotation").then(mod => ({ default: mod.TextAnnotation })));
const MarkdownRenderer = lazy(() => import("./markdown-renderer").then(mod => ({ default: mod.MarkdownRenderer })));

const widthOptions = [
  { label: "Narrow", value: "max-w-2xl" },
  { label: "Medium", value: "max-w-3xl" },
  { label: "Wide", value: "max-w-4xl" },
  { label: "Extra Wide", value: "max-w-6xl" },
];

function RetryProcessing({ article }: { article: any }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doRetry = async () => {
    setRetrying(true);
    setErr(null);
    try {
      const fileUrl: string | undefined =
        article.sourceUrl || article.uploadFileId;
      if (!fileUrl) throw new Error("Original file URL not available.");

      const fromUrl = (() => {
        try {
          const u = new URL(fileUrl);
          return u.pathname.split("/").pop() || "";
        } catch {
          return "";
        }
      })();
      const fileName = fromUrl || `${article.title || "document"}.pdf`;

      const res = await fetch("/api/process-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, fileName, title: article.title }),
      });
      if (!res.ok) {
        let msg = "Failed to queue processing";
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const { articleId } = await res.json();
      router.push(`/read/${articleId}`);
    } catch (e: any) {
      setErr(e?.message || "Retry failed");
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={doRetry}
        disabled={retrying}
        className="rounded-full"
      >
        {retrying ? "Retrying…" : "Retry processing"}
      </Button>
      {err && (
        <span className="text-xs font-light text-destructive">{err}</span>
      )}
    </div>
  );
}

export function ReadingView({ articleId }: { articleId: string }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const convex = useConvex();
  const article = useQuery(
    api.articles.getArticle,
    isLoaded && isSignedIn ? { id: articleId as Id<"articles"> } : "skip",
  );
  const contentUrl = useQuery(
    api.articleContent.readArticleContent,
    article?.contentStorageId
      ? { storageId: article.contentStorageId }
      : "skip",
  );
  const [storedContent, setStoredContent] = useState<string | null>(null);
  const [imagesWithUrls, setImagesWithUrls] = useState<any[] | undefined>(undefined);
  const router = useRouter();
  const [escPressCount, setEscPressCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [contentWidth, setContentWidth] = useState("max-w-4xl");
  const [isTouch, setIsTouch] = useState(false);

  // Fetch content from URL
  useEffect(() => {
    if (contentUrl) {
      fetch(contentUrl)
        .then((res) => res.text())
        .then((text) => setStoredContent(text))
        .catch((err) => console.error("Failed to fetch content:", err));
    }
  }, [contentUrl]);

  // Fetch image URLs from storage IDs
  useEffect(() => {
    const fetchImageUrls = async () => {
      if (!article?.metadata?.images) {
        setImagesWithUrls(undefined);
        return;
      }

      const images = article.metadata.images;
      
      // Check if images have storageId (new format)
      const hasStorageIds = images.some((img: any) => img.storageId);
      
      if (!hasStorageIds) {
        // Legacy format with base64, use as is
        setImagesWithUrls(images);
        return;
      }

      // New format: fetch URLs from storage using Convex
      const imagesWithUrlsPromises = images.map(async (img: any) => {
        if (img.storageId) {
          try {
            const url = await convex.query(api.articleContent.getImageUrl, { 
              storageId: img.storageId 
            });
            return { ...img, url };
          } catch (err) {
            console.error("Failed to get image URL:", err);
            return img;
          }
        }
        return img;
      });

      const resolved = await Promise.all(imagesWithUrlsPromises);
      setImagesWithUrls(resolved);
    };

    fetchImageUrls();
  }, [article?.metadata?.images, convex]);

  // Load width preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("reading-width");
    if (saved && widthOptions.some((opt) => opt.value === saved)) {
      setContentWidth(saved);
    }
  }, []);

  // Save width preference to localStorage
  useEffect(() => {
    localStorage.setItem("reading-width", contentWidth);
  }, [contentWidth]);

  const currentWidthIndex = widthOptions.findIndex(
    (opt) => opt.value === contentWidth,
  );

  const increaseWidth = () => {
    if (currentWidthIndex < widthOptions.length - 1) {
      setContentWidth(widthOptions[currentWidthIndex + 1].value);
    }
  };

  const decreaseWidth = () => {
    if (currentWidthIndex > 0) {
      setContentWidth(widthOptions[currentWidthIndex - 1].value);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (
        currentScrollY < lastScrollY &&
        !isDismissed &&
        currentScrollY > 100
      ) {
        setShowPrompt(true);
      } else if (currentScrollY > lastScrollY) {
        setShowPrompt(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isDismissed]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);
    const listener = (event: MediaQueryListEvent) => setIsTouch(event.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    let escTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEscPressCount((prev) => {
          const newCount = prev + 1;

          if (newCount === 1) {
            if (!isDismissed) {
              setShowPrompt(true);
            }
          }

          return newCount;
        });

        clearTimeout(escTimer);
        escTimer = setTimeout(() => {
          setEscPressCount(0);
        }, 1000);
      }

      if (e.key === "[") {
        e.preventDefault();
        decreaseWidth();
      }

      if (e.key === "]") {
        e.preventDefault();
        increaseWidth();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(escTimer);
    };
  }, [router, isDismissed]);

  useEffect(() => {
    if (escPressCount === 2) {
      router.push("/browse");
    }
  }, [escPressCount, router]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowPrompt(false);
  };

  if (!isLoaded) {
    return (
      <div className="pt-32 pb-32">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <p className="text-muted-foreground font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (article === undefined) {
    return (
      <div className="pt-32 pb-32">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <p className="text-muted-foreground font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoaded && isSignedIn && !article) {
    return (
      <div className="pt-32 pb-32">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            back
          </Link>
          <div className="mt-16">
            <p className="text-muted-foreground font-light">
              Article not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  if (!article) {
    return null;
  }

  const a = article as NonNullable<typeof article>;
  const displayContent = storedContent ?? "";

  return (
    <motion.div 
      className="pt-32 pb-32 flex gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {showPrompt && !isDismissed && (
          <motion.div 
            className="fixed top-20 left-0 right-0 z-50 flex justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div 
              className="bg-background/80 backdrop-blur-sm px-6 py-2 text-xs font-light text-muted-foreground flex items-center gap-4 rounded-full"
              whileHover={{ scale: 1.02 }}
            >
              <span>Press ESC twice to exit this article</span>
              <motion.button
                onClick={handleDismiss}
                className="hover:text-foreground cursor-pointer"
                aria-label="Dismiss"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Width Controls - Floating Bottom */}
      <AnimatePresence>
        {a.processingStatus === "completed" && (
          <motion.div 
            className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center pb-6 pt-3"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
          >
            <motion.div 
              className="flex items-center gap-3 rounded-full border border-border bg-background/90 px-4 py-2 shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
            >
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={decreaseWidth}
                  disabled={currentWidthIndex === 0}
                  className="h-8 w-8 p-0 hover:bg-foreground/10"
                  aria-label="Decrease reading width"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </motion.div>
              <motion.span 
                className="text-xs font-light text-muted-foreground"
                key={currentWidthIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                Width: {widthOptions[currentWidthIndex]?.label}
              </motion.span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={increaseWidth}
                  disabled={currentWidthIndex === widthOptions.length - 1}
                  className="h-8 w-8 p-0 hover:bg-foreground/10"
                  aria-label="Increase reading width"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`${contentWidth} mx-auto px-6 lg:px-8 flex-1`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground cursor-pointer mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            back
          </Link>
        </motion.div>

        <motion.header 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-light mb-6 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {a.title}
          </motion.h1>

          <motion.div 
            className="flex items-center gap-4 text-sm font-light text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {a.metadata?.author && (
              <>
                <span>{a.metadata.author}</span>
                <span>·</span>
              </>
            )}
            <span>{new Date(a.createdAt).toLocaleDateString()}</span>
            {a.metadata?.estimatedReadingTime && (
              <>
                <span>·</span>
                <span>{a.metadata.estimatedReadingTime} min read</span>
              </>
            )}
          </motion.div>
        </motion.header>

        {a.processingStatus !== "completed" ? (
          <motion.div 
            className="border border-border p-6 rounded-lg bg-background/50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {a.processingStatus === "failed" ? (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm font-light text-destructive">
                  Processing failed
                </p>
                {a.processingError && (
                  <p className="text-xs font-light text-muted-foreground">
                    {a.processingError}
                  </p>
                )}
                <RetryProcessing article={a} />
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm font-light text-muted-foreground">
                  Processing your document...{" "}
                  {Math.round(a.processingProgress || 0)}%
                </p>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-foreground"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(a.processingProgress || 0)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                {displayContent && (
                  <motion.div 
                    className="mt-4 text-xs font-light text-muted-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p>Preview:</p>
                    <div className="mt-2 max-h-48 overflow-auto border border-border rounded p-3">
                      <Suspense fallback={<div className="animate-pulse h-32 bg-border/20 rounded" />}>
                        <MarkdownRenderer
                          content={
                            displayContent.slice(0, 2000) +
                            (displayContent.length > 2000 ? "..." : "")
                          }
                          images={imagesWithUrls}
                        />
                      </Suspense>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Suspense 
              fallback={
                <div className="space-y-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-border/20 rounded w-3/4" />
                    <div className="h-4 bg-border/20 rounded w-full" />
                    <div className="h-4 bg-border/20 rounded w-5/6" />
                    <div className="h-4 bg-border/20 rounded w-full" />
                    <div className="h-4 bg-border/20 rounded w-2/3" />
                  </div>
                </div>
              }
            >
              <TextAnnotation
                articleId={articleId as Id<"articles">}
                userId={userId || ""}
              >
                <article className="prose prose-lg max-w-none article-content font-sans">
                  <div className="text-lg leading-[1.8] text-muted-foreground">
                    <MarkdownRenderer
                      content={displayContent}
                      images={imagesWithUrls}
                    />
                  </div>
                </article>
              </TextAnnotation>
            </Suspense>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
