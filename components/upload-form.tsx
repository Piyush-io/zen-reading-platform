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
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center animate-fade-in">
          <p className="text-sm font-light text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {!pdfFile ? (
          <div className="rounded-3xl border border-border/60 bg-background/80 p-12 text-center shadow-sm transition-all hover:border-foreground/20">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-light">Select a PDF document</h3>
                <p className="text-sm font-light text-muted-foreground">
                  Extract text using Mistral AI OCR
                </p>
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
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-3xl border border-border/60 bg-background/80 p-10 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <p className="text-xs font-light uppercase tracking-wider text-muted-foreground">
                    PDF ready
                  </p>
                  <p className="text-base font-light">{pdfFile.name}</p>
                </div>
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting}
                onClick={async () => {
                  if (!pdfFile) return;
                  await handlePDFUpload(pdfFile.url, pdfFile.name);
                }}
                className="rounded-full font-light text-sm px-12 py-6 bg-transparent cursor-pointer hover:scale-105 hover:bg-foreground/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 min-w-[160px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing
                  </span>
                ) : showSuccess ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Queued
                  </span>
                ) : (
                  "Process document"
                )}
              </Button>

              {isSubmitting && (
                <p className="text-xs font-light text-muted-foreground animate-fade-in">
                  Queuing for background processing...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
