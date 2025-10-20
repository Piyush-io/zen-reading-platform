import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Mistral } from "@mistralai/mistralai";
import Groq from "groq-sdk";

const WORDS_PER_MINUTE = 200;
const MIN_TEXT_LENGTH = 50;
const CHUNK_SIZE = 8000;
const REFINEMENT_RETRIES = 3;
const UPDATE_BATCH_SIZE = 3;

interface ImageData {
  index: number;
  base64: string;
  id: string;
}

interface StoredImageData {
  index: number;
  storageId: string;
  id: string;
}

const deduplicateRepeatedSequences = (text: string): string => {
  const lines = text.split("\n");
  const deduped: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const current = lines[i];

    if (!current.trim()) {
      deduped.push(current);
      i++;
      continue;
    }

    let repeatCount = 1;
    while (
      i + repeatCount < lines.length &&
      lines[i + repeatCount].trim() === current.trim()
    ) {
      repeatCount++;
    }

    const looksLikeCode =
      /[←{};\[\]]|\/\/|for\s|while\s|if\s|else\s|return\s|function\s|def\s|class\s|import\s/.test(
        current,
      );

    if (repeatCount >= 3 && !looksLikeCode) {
      deduped.push(current);
      i += repeatCount;
    } else {
      for (let j = 0; j < repeatCount; j++) {
        deduped.push(lines[i + j]);
      }
      i += repeatCount;
    }
  }

  return deduped.join("\n");
};

const extractTextAndImages = (ocr: any): { text: string; images: ImageData[] } => {
  const rawText = (ocr.pages ?? [])
    .map((p: any) => p.markdown ?? p.text ?? "")
    .join("\n\n")
    .trim();

  const text = deduplicateRepeatedSequences(rawText);

  const images = (ocr.pages ?? [])
    .flatMap((p: any) => p.images ?? [])
    .filter((img: any) => img.imageBase64 || img.image_base64)
    .map((img: any, idx: number) => {
      const raw = String(img.imageBase64 || img.image_base64 || "").trim();
      let base64 = raw;
      if (raw && !raw.startsWith("data:")) {
        let mime = "image/png";
        if (raw.startsWith("/9j/")) mime = "image/jpeg";
        else if (raw.startsWith("iVBORw0KGgo")) mime = "image/png";
        else if (raw.startsWith("R0lGOD")) mime = "image/gif";
        else if (raw.startsWith("UklGR")) mime = "image/webp";
        base64 = `data:${mime};base64,${raw}`;
      }
      return {
        index: idx + 1,
        base64,
        id: img.id || `img-${idx + 1}`,
      };
    });

  if (!text || text.length < MIN_TEXT_LENGTH) {
    throw new Error(
      "OCR returned insufficient content. Please verify the PDF or try another file.",
    );
  }

  return { text, images };
};

const uploadImagesToStorage = async (
  ctx: any,
  images: ImageData[],
): Promise<StoredImageData[] | undefined> => {
  if (images.length === 0) return undefined;

  const stored: StoredImageData[] = [];

  for (const image of images) {
    const match = image.base64.match(/^data:(.+);base64,(.*)$/i);
    const mime = match ? match[1] : "image/png";
    const base64 = match ? match[2] : image.base64;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    const storageId = await ctx.storage.store(blob);
    stored.push({ index: image.index, storageId, id: image.id });
  }

  return stored;
};

const chunkText = (text: string, size: number = CHUNK_SIZE): string[] => {
  const chunks: string[] = [];
  const lines = text.split("\n");
  let current = "";

  const isBoundary = (line: string): boolean => {
    const trimmed = line.trim();
    if (/^#{1,6}\s/.test(trimmed)) return true;
    if (trimmed.startsWith("```") || /^[-*_]{3,}$/.test(trimmed)) return true;
    if (trimmed.startsWith("|") && !/^[|\s:-]+$/.test(trimmed)) return true;
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return true;
    if (trimmed.startsWith(">")) return true;
    return false;
  };

  const hasOpenDelimiter = (chunk: string): boolean => {
    const blockMath = (chunk.match(/\$\$/g) || []).length;
    if (blockMath % 2 !== 0) return true;

    const withoutBlock = chunk.replace(/\$\$.*?\$\$/g, "");
    const inlineMath = (withoutBlock.match(/\$/g) || []).length;
    if (inlineMath % 2 !== 0) return true;

    const codeBlocks = (chunk.match(/```/g) || []).length;
    if (codeBlocks % 2 !== 0) return true;

    const bold = (chunk.match(/\*\*/g) || []).length;
    if (bold % 2 !== 0) return true;

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const potential = current + line + "\n";

    if (potential.length > size && current.length > 0) {
      let breakIndex = i;
      if (!isBoundary(line) || hasOpenDelimiter(current)) {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (isBoundary(lines[j]) && !hasOpenDelimiter(current + lines[i] + "\n")) {
            breakIndex = j;
            break;
          }
        }
      }

      if (breakIndex > i) {
        for (let j = i; j < breakIndex; j++) {
          current += lines[j] + "\n";
        }
        i = breakIndex - 1;
      }

      chunks.push(current.trim());
      current = "";
    } else {
      current = potential;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
};

const extractImagePlaceholders = (
  text: string,
): { cleaned: string; placeholders: Map<string, string> } => {
  const placeholders = new Map<string, string>();
  let counter = 0;

  const patterns = [
    /!\[(?:img|image)-(\d+)\.(jpe?g|png|gif|webp)\]\([^)]+\)/gi,
    /\[(?:Image|Figure|Fig\.?)[\s\u00A0]*[:#]?[\s\u00A0]*(\d+)\]/gi,
    /!\[[^\]]*\]\([^)]+\)/g,
  ];

  let cleaned = text;

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, (match) => {
      const placeholder = `__IMAGE_PLACEHOLDER_${counter}__`;
      placeholders.set(placeholder, match);
      counter++;
      return placeholder;
    });
  }

  return { cleaned, placeholders };
};

const restoreImagePlaceholders = (
  text: string,
  placeholders: Map<string, string>,
): string => {
  let restored = text;
  for (const [placeholder, original] of placeholders.entries()) {
    restored = restored.replace(new RegExp(placeholder, "g"), original);
  }
  return restored;
};

const createRefinePrompt = (chunk: string): string => `You are a markdown formatting specialist. Your ONLY job is to fix formatting issues in OCR-extracted markdown while preserving ALL original content exactly as written.
First consider the document type, what it actually is and then proceed.

CRITICAL RULES:
1. DO NOT change, rephrase, summarize, or rewrite ANY content
2. DO NOT add, remove, or modify any words, sentences, or paragraphs
3. DO NOT correct spelling, grammar, or factual errors
4. DO NOT translate or interpret anything
5. ONLY fix markdown syntax and formatting issues

ALLOWED FIXES ONLY:
- Fix broken markdown headers (add missing # symbols, fix spacing after #)
- Fix list formatting (ensure proper - or * with space, correct indentation)
- Fix table syntax (add missing | separators, add alignment row |---|---|)
- Fix LaTeX and its delimiters (ensure $ for inline, $$ for block equations)
- Remove OCR artifacts: zero-width spaces (U+200B), invisible characters (U+2061)
- Fix line breaks that split words incorrectly (rejoin hyphenated words at line breaks)
- Preserve [Image #N] placeholders exactly as they appear

FORBIDDEN ACTIONS:
- DO NOT abbreviate or shorten table headers
- DO NOT split tables into multiple tables
- DO NOT reword table contents
- DO NOT change number formats or data values
- DO NOT add markdown features that weren't there (like bold, italic, links)
- DO NOT restructure sections or change heading levels

OUTPUT FORMAT:
Return ONLY the corrected markdown text. No explanations, no comments, no metadata. Start your response immediately with the corrected markdown.

TEXT TO FORMAT:
${chunk}`;

const refineChunkWithRetry = async (chunk: string, apiKey: string): Promise<string> => {
  const { cleaned, placeholders } = extractImagePlaceholders(chunk);
  const groqClient = new Groq({ apiKey });

  for (let attempt = 0; attempt < REFINEMENT_RETRIES; attempt++) {
    try {
      const completion = await groqClient.chat.completions.create({
        model: process.env.GROQ_REFINER_MODEL || "mixtral-8x7b-32768",
        messages: [{ role: "user", content: createRefinePrompt(cleaned) }],
        temperature: Number(process.env.GROQ_REFINER_TEMPERATURE ?? 0.2),
        max_tokens: 2048,
      });

      const refined = completion.choices[0]?.message?.content ?? cleaned;
      return deduplicateRepeatedSequences(
        restoreImagePlaceholders(refined, placeholders),
      );
    } catch (error) {
      if (attempt === REFINEMENT_RETRIES - 1) {
        return chunk;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  return chunk;
};

const updateArticle = async (
  ctx: any,
  args: {
    articleId: string;
    clerkId: string;
    title?: string;
    metadata?: any;
    content?: string;
    progress?: number;
    status?: "pending" | "processing" | "completed" | "failed";
    error?: string | null;
  },
) => {
  const { articleId, clerkId, title, metadata, content, progress, status, error } =
    args;

  const article = await ctx.runQuery(internal.articles.getArticleByIdInternal, {
    id: args.articleId,
  });
  if (!article) return;
  if (article.userId !== clerkId) return;

  const updates: any = { updatedAt: new Date().toISOString() };

  if (title !== undefined) updates.title = title;
  if (metadata !== undefined) updates.metadata = metadata;
  if (progress !== undefined) updates.processingProgress = progress;
  if (status !== undefined) updates.processingStatus = status;
  if (error !== undefined && error !== null) updates.processingError = error;

  if (content !== undefined) {
    if (article.contentStorageId) {
      await ctx.storage.delete(article.contentStorageId);
    }
    const storageId = await ctx.storage.store(
      new Blob([content], { type: "text/markdown" }),
    );
    updates.contentStorageId = storageId;
  }

  await ctx.runMutation(internal.articles.updateArticleInternal, {
    id: args.articleId,
    updates,
  });
};

export const processPdf = internalAction({
  args: {
    clerkId: v.string(),
    articleId: v.id("articles"),
    fileUrl: v.string(),
    fileName: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (!process.env.MISTRAL_API_KEY) {
        throw new Error("Missing MISTRAL_API_KEY");
      }
      if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing GROQ_API_KEY");
      }

      const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
      const ocr = await mistral.ocr.process({
        model: process.env.MISTRAL_OCR_MODEL || "mistral-ocr-latest",
        document: { type: "document_url", documentUrl: args.fileUrl },
        includeImageBase64: true,
      });

      const { text: extractedText, images } = extractTextAndImages(ocr);
      const storedImages = await uploadImagesToStorage(ctx, images);

      const initialPreview = extractedText.substring(0, 2000);
      await updateArticle(ctx, {
        articleId: args.articleId,
        clerkId: args.clerkId,
        title: args.title || args.fileName.replace(/\.pdf$/i, ""),
        metadata: storedImages
          ? {
              wordCount: extractedText.split(/\s+/).filter(Boolean).length,
              estimatedReadingTime: Math.ceil(
                extractedText.split(/\s+/).filter(Boolean).length /
                  WORDS_PER_MINUTE,
              ),
              images: storedImages,
            }
          : {
              wordCount: extractedText.split(/\s+/).filter(Boolean).length,
              estimatedReadingTime: Math.ceil(
                extractedText.split(/\s+/).filter(Boolean).length /
                  WORDS_PER_MINUTE,
              ),
            },
        content: initialPreview,
        progress: 1,
        status: "processing",
        error: null,
      });

      const chunks = chunkText(extractedText);
      const refinedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const refined = await refineChunkWithRetry(chunks[i], process.env.GROQ_API_KEY!);
        refinedChunks.push(refined);

        const shouldFlush =
          (i + 1) % UPDATE_BATCH_SIZE === 0 || i === chunks.length - 1;

        if (shouldFlush) {
          const aggregated = refinedChunks.join("\n\n");
          const wordCount = aggregated.split(/\s+/).filter(Boolean).length;
          const estimatedReadingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);

          await updateArticle(ctx, {
            articleId: args.articleId,
            clerkId: args.clerkId,
            metadata: {
              wordCount,
              estimatedReadingTime,
              images: storedImages,
            },
            content: aggregated,
            progress: Math.round(((i + 1) / chunks.length) * 100),
            status: i === chunks.length - 1 ? "completed" : "processing",
            error: null,
          });
        }
      }
    } catch (error: any) {
      await updateArticle(ctx, {
        articleId: args.articleId,
        clerkId: args.clerkId,
        status: "failed",
        error: error?.message ?? "Unknown error",
      });
    }
  },
});

export const queuePdfProcessing = action({
  args: {
    clerkId: v.string(),
    articleId: v.id("articles"),
    fileUrl: v.string(),
    fileName: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.background.processPdf, args);
  },
});
