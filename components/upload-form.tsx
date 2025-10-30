"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function UploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<{ url: string; name: string } | null>(
    null,
  );

  const handlePDFUpload = async (fileUrl: string, fileName: string) => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl,
          fileName,
          title: title || undefined,
        }),
      });

      if (!response.ok) {
        try {
          const err = await response.json();
          throw new Error(err?.error || "Failed to process PDF");
        } catch {
          throw new Error("Failed to process PDF");
        }
      }

      const result = await response.json();

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/read/${result.articleId}`);
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process PDF";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence>
        {error && (
          <motion.div 
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <p className="text-sm font-light text-red-600">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {!pdfFile ? (
            <motion.div 
              key="upload-zone"
              className="rounded-3xl border border-border/60 bg-background/80 p-12 text-center shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ 
                borderColor: "rgba(255, 255, 255, 0.2)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="space-y-2">
                  <motion.h3 
                    className="text-lg font-light"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Select a PDF document
                  </motion.h3>
                  <motion.p 
                    className="text-sm font-light text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Extract text using Mistral AI OCR
                  </motion.p>
                </div>
              <div className="flex justify-center pt-4">
                <UploadButton<OurFileRouter, "pdfUploader">
                  endpoint="pdfUploader"
                  onClientUploadComplete={async (res) => {
                    if (!res?.[0]) return;
                    console.log("UploadThing response:", res[0]);
                    const u = (res[0] as any).ufsUrl ?? res[0].url;
                    console.log("Using URL:", u);
                    setPdfFile({ url: u, name: res[0].name });
                  }}
                  onUploadError={(error: Error) => {
                    setError(`Upload failed: ${error.message}`);
                  }}
                  config={{
                    mode: "auto",
                  }}
                  appearance={{
                    button:
                      "rounded-full font-light text-sm px-8 py-3 border border-border bg-background text-foreground hover:bg-foreground/5 transition-all duration-200",
                    container: "w-full flex justify-center",
                    allowedContent:
                      "text-xs font-light text-muted-foreground/70 mt-3",
                  }}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="file-ready"
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div 
                className="rounded-3xl border border-border/60 bg-background/80 p-10 shadow-sm"
                whileHover={{ boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
              >
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <p className="text-xs font-light uppercase tracking-wider text-muted-foreground">
                    PDF ready
                  </p>
                  <motion.p 
                    className="text-base font-light"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {pdfFile.name}
                  </motion.p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPdfFile(null);
                      setTitle("");
                    }}
                    className="text-xs font-light hover:bg-foreground/5"
                  >
                    Change file
                  </Button>
                </motion.div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60">
                <Label
                  htmlFor="pdf-title"
                  className="text-xs font-light uppercase tracking-wider text-muted-foreground"
                >
                  Title (optional)
                </Label>
                <Input
                  id="pdf-title"
                  type="text"
                  placeholder="Enter a custom title for this document"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  disabled={isSubmitting}
                  className="h-12 text-base font-light bg-transparent cursor-text focus:ring-2 focus:ring-foreground/20 border-border/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <motion.div
                whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!pdfFile) return;
                    await handlePDFUpload(pdfFile.url, pdfFile.name);
                  }}
                  className="rounded-full font-light text-sm px-12 py-6 bg-transparent cursor-pointer hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[160px]"
                >
                  <AnimatePresence mode="wait">
                    {isSubmitting ? (
                      <motion.span 
                        key="processing"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing
                      </motion.span>
                    ) : showSuccess ? (
                      <motion.span 
                        key="success"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Check className="w-4 h-4" />
                        Queued
                      </motion.span>
                    ) : (
                      <motion.span
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Process document
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>

              <AnimatePresence>
                {isSubmitting && (
                  <motion.p 
                    className="text-xs font-light text-muted-foreground"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Queuing for background processing...
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
