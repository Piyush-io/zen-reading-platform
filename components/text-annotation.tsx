"use client";

import type React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Pencil, Sparkles, Loader2, Trash2 } from "lucide-react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface Annotation {
  id: string;
  convexId?: Id<"annotations">;
  type: "note" | "ai";
  text: string;
  highlightId: string;
  highlightPosition: { x: number; y: number };
  notePosition: { x: number; y: number };
  noteText?: string;
  aiExplanation?: string;
  isEditing: boolean;
  isLoading?: boolean;
  startOffset: number;
  endOffset: number;
}

interface TextAnnotationProps {
  children: React.ReactNode;
  articleId: Id<"articles">;
  userId: string;
}

// SVG Arrow Component with Framer Motion
function AnimatedArrow({ 
  from, 
  to, 
  id 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number }; 
  id: string;
}) {
  // Calculate control points for smooth curved arrow
  const midX = (from.x + to.x) / 2;
  const offsetX = (to.x - from.x) * 0.3;
  const controlPoint1 = { x: from.x + offsetX, y: from.y };
  const controlPoint2 = { x: to.x - offsetX, y: to.y };

  const pathD = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${to.x} ${to.y}`;

  return (
    <svg
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <motion.path
        d={pathD}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={2}
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {/* Arrow head */}
      <motion.circle
        cx={to.x}
        cy={to.y}
        r={4}
        fill="rgba(255, 255, 255, 0.4)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
      />
    </svg>
  );
}

export function TextAnnotation({
  children,
  articleId,
  userId,
}: TextAnnotationProps) {
  const generateCombinedExplanation = useAction(api.ai.generateCombinedExplanation);
  const savedAnnotations = useQuery(api.annotations.getAnnotations, {
    articleId,
    userId,
  });
  const createAnnotation = useMutation(api.annotations.createAnnotation);
  const updateAnnotation = useMutation(api.annotations.updateAnnotation);
  const deleteAnnotation = useMutation(api.annotations.deleteAnnotation);
  
  const [selection, setSelection] = useState<{
    text: string;
    range: Range | null;
    rect: DOMRect | null;
  } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [aiHover, setAiHover] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const aiHideTimer = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const hasRestoredAnnotations = useRef(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const getTextOffset = useCallback((node: Node, offset: number): number => {
    const contentEl = document.querySelector(".article-content");
    if (!contentEl) return 0;

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let totalOffset = 0;
    let currentNode: Node | null = walker.currentNode;

    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    return totalOffset;
  }, []);

  const restoreHighlightFromOffsets = useCallback((
    startOffset: number,
    endOffset: number,
    highlightId: string,
  ): DOMRect | null => {
    const contentEl = document.querySelector(".article-content");
    if (!contentEl) return null;

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;

    let node: Node | null = walker.currentNode;
    while (node) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentOffset + nodeLength >= startOffset) {
        startNode = node;
        startNodeOffset = startOffset - currentOffset;
      }

      if (!endNode && currentOffset + nodeLength >= endOffset) {
        endNode = node;
        endNodeOffset = endOffset - currentOffset;
        break;
      }

      currentOffset += nodeLength;
      node = walker.nextNode();
    }

    if (!startNode || !endNode) return null;

    const range = document.createRange();
    try {
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      return highlightText(range, highlightId);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (savedAnnotations && savedAnnotations.length > 0 && mounted && contentReady && !hasRestoredAnnotations.current) {
      const restored: Annotation[] = [];

      for (const saved of savedAnnotations) {
        const rect = restoreHighlightFromOffsets(
          saved.startOffset,
          saved.endOffset,
          saved.highlightId,
        );

        if (rect) {
          if (saved.type === "ai") {
            const spans = document.querySelectorAll(`[data-highlight-id="${saved.highlightId}"]`);
            spans.forEach((span) => {
              const el = span as HTMLElement;
              el.style.cursor = "help";
              el.style.color = "#ffa500";
            });
          }

          restored.push({
            id: saved.highlightId.replace("highlight-", ""),
            convexId: saved._id,
            type: saved.type,
            text: saved.selectedText,
            highlightId: saved.highlightId,
            highlightPosition: saved.highlightPosition,
            notePosition: saved.notePosition,
            noteText: saved.noteContent,
            aiExplanation: saved.aiExplanation,
            isEditing: false,
            isLoading: false,
            startOffset: saved.startOffset,
            endOffset: saved.endOffset,
          });
        }
      }

      if (restored.length > 0) {
        setAnnotations(restored);
        hasRestoredAnnotations.current = true;
      }
    }
  }, [savedAnnotations, mounted, contentReady, restoreHighlightFromOffsets]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkContentReady = () => {
      const contentEl = document.querySelector(".article-content");
      if (contentEl && contentEl.textContent && contentEl.textContent.length > 100) {
        setContentReady(true);
      }
    };

    checkContentReady();
    
    const timer = setInterval(checkContentReady, 100);
    const timeout = setTimeout(() => {
      clearInterval(timer);
      setContentReady(true);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleSelection = (e: MouseEvent) => {
      // Keep selection when interacting with the floating selection menu
      const target = e.target as Element | null;
      if (target && target.closest(".selection-menu")) return;

      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);

        // Check if selection is within article-content
        const contentEl = document.querySelector(".article-content");
        if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) {
          setSelection(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString(),
          range,
          rect,
        });
      } else {
        setSelection(null);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
    };
  }, []);

  useEffect(() => {
    const bindings: Array<{
      el: HTMLElement;
      enter: (e: Event) => void;
      leave: (e: Event) => void;
    }> = [];

    annotations
      .filter((ann) => ann.type === "ai")
      .forEach((ann) => {
        const el = document.getElementById(ann.highlightId);
        if (!el) return;

        const handleMouseEnter = () => {
          if (aiHideTimer.current) {
            clearTimeout(aiHideTimer.current);
            aiHideTimer.current = null;
          }
          setAiHover(ann.id);
        };
        const handleMouseLeave = () => {
          if (aiHideTimer.current) clearTimeout(aiHideTimer.current);
          aiHideTimer.current = setTimeout(() => {
            setAiHover(null);
          }, 200);
        };

        el.addEventListener("mouseenter", handleMouseEnter);
        el.addEventListener("mouseleave", handleMouseLeave);
        bindings.push({ el, enter: handleMouseEnter, leave: handleMouseLeave });
      });

    return () => {
      bindings.forEach(({ el, enter, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
    };
  }, [annotations]);

  const highlightText = useCallback((range: Range, highlightId: string) => {
    // Compute initial rect before DOM mutations to avoid layout issues
    const initialRect = range.getBoundingClientRect();

    // Safe intersects check for broad browser support
    const intersectsNodeSafe = (r: Range, node: Node) => {
      const anyRange = r as any;
      if (typeof anyRange.intersectsNode === "function") {
        return anyRange.intersectsNode(node);
      }
      const nr = document.createRange();
      nr.selectNodeContents(node);
      return (
        r.compareBoundaryPoints(Range.END_TO_START, nr) < 0 &&
        r.compareBoundaryPoints(Range.START_TO_END, nr) > 0
      );
    };

    // Helper to wrap a portion of a text node with a styled span
    const wrapPortion = (
      textNode: Text,
      start: number,
      end: number,
      assignId: boolean,
    ) => {
      const length = textNode.length;
      const safeStart = Math.max(0, Math.min(start, length));
      const safeEnd = Math.max(safeStart, Math.min(end, length));

      // Split into [before][target][after]
      const after = textNode.splitText(safeStart);
      after.splitText(safeEnd - safeStart);

      const span = document.createElement("span");
      if (assignId) {
        span.id = highlightId;
      }
      // Mark as our highlight to avoid re-wrapping
      span.dataset.highlight = "true";
      span.dataset.highlightId = highlightId;
      span.style.color = "#ff4500";
      span.style.transition = "color 0.2s";

      after.parentNode?.insertBefore(span, after);
      span.appendChild(after);

      return span;
    };

    try {
      // Build a static list of target text nodes first to avoid mutating while iterating
      const nodesToWrap: Array<{ node: Text; start: number; end: number }> = [];

      const common = range.commonAncestorContainer;
      const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
      
      let node: Node | null = walker.currentNode;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text;
          
          if (textNode.nodeValue && textNode.nodeValue.length > 0) {
            if (
              !textNode.parentElement ||
              !textNode.parentElement.closest('[data-highlight="true"]')
            ) {
              if (intersectsNodeSafe(range, textNode)) {
                const isStart = textNode === range.startContainer;
                const isEnd = textNode === range.endContainer;

                const localStart =
                  isStart && range.startContainer.nodeType === Node.TEXT_NODE
                    ? range.startOffset
                    : 0;
                const localEnd =
                  isEnd && range.endContainer.nodeType === Node.TEXT_NODE
                    ? range.endOffset
                    : textNode.length;

                if (localStart < localEnd) {
                  nodesToWrap.push({ node: textNode, start: localStart, end: localEnd });
                }
                
                if (isEnd) break;
              }
            }
          }
        }
        
        node = walker.nextNode();
      }

      // Fallback if nothing got wrapped (e.g., unexpected DOM), try a minimal single-node wrap
      if (
        nodesToWrap.length === 0 &&
        range.startContainer.nodeType === Node.TEXT_NODE
      ) {
        nodesToWrap.push({
          node: range.startContainer as Text,
          start: range.startOffset,
          end: Math.min(range.endOffset, (range.startContainer as Text).length),
        });
      }

      let first = true;
      for (const item of nodesToWrap) {
        wrapPortion(item.node, item.start, item.end, first);
        first = false;
      }
    } catch {
      // As a last resort, do nothing to avoid destroying structure
    }

    // Return the original selection rect to position notes accurately
    return initialRect;
  }, []);

  const handleAddNote = useCallback(() => {
    if (!selection || !selection.range) return;

    const id = Math.random().toString(36).substr(2, 9);
    const highlightId = `highlight-${id}`;

    const startOffset = getTextOffset(
      selection.range.startContainer,
      selection.range.startOffset,
    );
    const endOffset = getTextOffset(
      selection.range.endContainer,
      selection.range.endOffset,
    );

    const highlightRect = highlightText(selection.range, highlightId);

    const viewportWidth = window.innerWidth;
    const contentEl = document.querySelector(
      ".article-content",
    ) as HTMLElement | null;
    const contentRect = contentEl?.getBoundingClientRect();
    const contentLeft = contentRect?.left ?? 0;
    const contentRight = contentRect?.right ?? viewportWidth;
    const contentCenter = (contentLeft + contentRight) / 2;
    const highlightCenter = highlightRect.left + highlightRect.width / 2;
    const isLeftSide = highlightCenter < contentCenter;

    // Compute gutter centers (space outside the article content)
    const leftGutterCenter = contentLeft / 2;
    const rightGutterCenter = contentRight + (viewportWidth - contentRight) / 2;

    // Approximate note width for initial placement
    const NOTE_WIDTH = 300;
    let targetCenterX = isLeftSide ? leftGutterCenter : rightGutterCenter;
    let noteLeft = targetCenterX - NOTE_WIDTH / 2;

    // Clamp inside viewport with small padding
    noteLeft = Math.max(8, Math.min(noteLeft, viewportWidth - NOTE_WIDTH - 8));

    // Fallback if gutters are too small (e.g., narrow screens)
    if (viewportWidth < 900) {
      // Place note just outside content area with slight offset
      noteLeft = isLeftSide ? contentLeft - NOTE_WIDTH - 24 : contentRight + 24;
      // If still overflowing, snap inside
      if (noteLeft < 8) noteLeft = 8;
      if (noteLeft + NOTE_WIDTH > viewportWidth - 8)
        noteLeft = viewportWidth - NOTE_WIDTH - 8;
    }

    const noteX = noteLeft + window.scrollX;
    const noteY = highlightRect.top + window.scrollY;

    const newAnnotation: Annotation = {
      id,
      type: "note",
      text: selection.text,
      highlightId,
      highlightPosition: {
        x: isLeftSide ? highlightRect.left : highlightRect.right,
        y: highlightRect.top + highlightRect.height / 2,
      },
      notePosition: { x: noteX, y: noteY },
      noteText: "",
      isEditing: true,
      startOffset,
      endOffset,
    };

    setAnnotations([...annotations, newAnnotation]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      const textarea = document.querySelector(
        `#note-${id} textarea`,
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus({ preventScroll: true });
      }
    }, 50);
  }, [selection, annotations, getTextOffset, highlightText]);

  const handleAskAI = useCallback(async () => {
    if (!selection || !selection.range) return;

    setIsAiProcessing(true);

    const id = Math.random().toString(36).substr(2, 9);
    const highlightId = `highlight-${id}`;

    const startOffset = getTextOffset(
      selection.range.startContainer,
      selection.range.startOffset,
    );
    const endOffset = getTextOffset(
      selection.range.endContainer,
      selection.range.endOffset,
    );

    highlightText(selection.range, highlightId);
    const spans = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
    spans.forEach((span) => {
      const el = span as HTMLElement;
      el.style.cursor = "help";
      el.style.color = "#ffa500";
    });

    const newAnnotation: Annotation = {
      id,
      type: "ai",
      text: selection.text,
      highlightId,
      highlightPosition: { x: 0, y: 0 },
      notePosition: { x: 0, y: 0 },
      aiExplanation: JSON.stringify({ eli5: "", summary: "", jargon: "" }),
      isEditing: false,
      isLoading: true,
      startOffset,
      endOffset,
    };

    setAnnotations([...annotations, newAnnotation]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();

    try {
      // Use combined explanation for faster response (1 API call instead of 3)
      const explanations = await generateCombinedExplanation({ 
        text: selection.text 
      });

      const aiExplanationStr = JSON.stringify(explanations);

      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id
            ? { ...ann, aiExplanation: aiExplanationStr, isLoading: false }
            : ann,
        ),
      );

      try {
        const convexId = await createAnnotation({
          articleId,
          userId,
          type: "ai",
          startOffset,
          endOffset,
          selectedText: selection.text,
          highlightId,
          highlightPosition: { x: 0, y: 0 },
          notePosition: { x: 0, y: 0 },
          aiExplanation: aiExplanationStr,
        });

        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, convexId } : a)),
        );
      } catch (error) {
        console.error("Failed to save AI annotation:", error);
      }
    } catch (error) {
      console.error("Failed to generate AI explanation:", error);
      toast.error("Failed to generate AI explanation. Please try again.");
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id
            ? {
                ...ann,
                aiExplanation: JSON.stringify({
                  eli5: "Failed to generate explanation. Please try again.",
                  summary: "Failed to generate explanation. Please try again.",
                  jargon: "Failed to generate explanation. Please try again.",
                }),
                isLoading: false,
              }
            : ann,
        ),
      );
    } finally {
      setIsAiProcessing(false);
    }
  }, [selection, annotations, getTextOffset, highlightText, generateCombinedExplanation, createAnnotation, articleId, userId]);

  const saveNote = useCallback(async (id: string) => {
    const annotation = annotations.find((a) => a.id === id);
    if (!annotation) return;

    setAnnotations(
      annotations.map((ann) =>
        ann.id === id ? { ...ann, isEditing: false } : ann,
      ),
    );

    try {
      if (annotation.convexId) {
        await updateAnnotation({
          id: annotation.convexId,
          noteContent: annotation.noteText || "",
        });
      } else {
        const convexId = await createAnnotation({
          articleId,
          userId,
          type: "note",
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset,
          selectedText: annotation.text,
          highlightId: annotation.highlightId,
          highlightPosition: annotation.highlightPosition,
          notePosition: annotation.notePosition,
          noteContent: annotation.noteText || "",
        });

        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, convexId } : a)),
        );
      }
    } catch (error) {
      console.error("Failed to save annotation:", error);
      toast.error("Failed to save note");
    }
  }, [annotations, updateAnnotation, createAnnotation, articleId, userId]);

  const handleDeleteNote = useCallback(async (id: string) => {
    const annotation = annotations.find((a) => a.id === id);
    if (!annotation) return;

    const highlightEl = document.getElementById(annotation.highlightId);
    if (highlightEl) {
      const parent = highlightEl.parentNode;
      while (highlightEl.firstChild) {
        parent?.insertBefore(highlightEl.firstChild, highlightEl);
      }
      highlightEl.remove();
    }

    setAnnotations((prev) => prev.filter((a) => a.id !== id));

    if (annotation.convexId) {
      try {
        await deleteAnnotation({ id: annotation.convexId });
      } catch (error) {
        console.error("Failed to delete annotation:", error);
        toast.error("Failed to delete note");
      }
    }
  }, [annotations, deleteAnnotation]);

  const handleNoteKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // Prevent global ESC handler from firing
      saveNote(id);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveNote(id);
    }
    // Shift+Enter allows new line (default behavior)
  }, [saveNote]);

  // Calculate arrow positions
  const arrowData = useMemo(() => {
    return annotations
      .filter((ann) => ann.type === "note")
      .map((ann) => {
        const highlightEl = document.getElementById(ann.highlightId);
        const noteEl = document.getElementById(`note-${ann.id}`);
        
        if (!highlightEl || !noteEl) return null;
        
        const highlightRect = highlightEl.getBoundingClientRect();
        const noteRect = noteEl.getBoundingClientRect();
        
        return {
          id: ann.id,
          from: {
            x: ann.highlightPosition.x,
            y: highlightRect.top + highlightRect.height / 2,
          },
          to: {
            x: noteRect.left + noteRect.width / 2,
            y: noteRect.top + 20,
          },
        };
      }).filter((data): data is NonNullable<typeof data> => data !== null);
  }, [annotations]);

  return (
    <div ref={containerRef} className="relative">
      {children}

      {/* Selection Menu */}
      <AnimatePresence>
        {selection && selection.rect && (
          <motion.div
            className="selection-menu fixed z-50 flex gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full"
            onMouseDown={(e) => e.preventDefault()}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              left: Math.max(0, Math.min(window.innerWidth - 160, selection.rect.left + selection.rect.width / 2 - 80)),
              top: Math.max(0, selection.rect.top - 60),
            }}
          >
            <motion.button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddNote}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1 text-sm font-light hover:bg-white/10 rounded-full cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              note
            </motion.button>
            <motion.button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAskAI}
              disabled={isAiProcessing}
              whileHover={{ scale: isAiProcessing ? 1 : 1.05 }}
              whileTap={{ scale: isAiProcessing ? 1 : 0.95 }}
              className="flex items-center gap-2 px-3 py-1 text-sm font-light hover:bg-white/10 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAiProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  ask ai
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {mounted &&
        createPortal(
          <>
            {/* Animated arrows with Framer Motion */}
            <AnimatePresence>
              {arrowData.map((data) => (
                <AnimatedArrow key={data.id} from={data.from} to={data.to} id={data.id} />
              ))}
            </AnimatePresence>

            {/* Notes with Draggable Animation */}
            <AnimatePresence>
              {annotations
                .filter((ann) => ann.type === "note")
                .map((ann) => (
                    <motion.div
                      key={ann.id}
                      id={`note-${ann.id}`}
                      drag={!ann.isEditing}
                      dragMomentum={false}
                      dragElastic={0.1}
                      dragConstraints={{ left: 0, right: window.innerWidth - 300, top: 0, bottom: window.innerHeight - 100 }}
                      style={{
                        position: "absolute",
                        left: ann.notePosition.x,
                        top: ann.notePosition.y,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onDragEnd={async (_, info) => {
                        const newX = ann.notePosition.x + info.offset.x;
                        const newY = ann.notePosition.y + info.offset.y;
                        
                        setAnnotations((prev) =>
                          prev.map((a) =>
                            a.id === ann.id
                              ? { ...a, notePosition: { x: newX, y: newY } }
                              : a,
                          ),
                        );

                        if (ann.convexId) {
                          try {
                            await updateAnnotation({
                              id: ann.convexId,
                              notePosition: { x: newX, y: newY },
                            });
                          } catch (error) {
                            console.error("Failed to update note position:", error);
                          }
                        }
                      }}
                      className="z-50 bg-transparent p-4 max-w-xs pointer-events-auto"
                      whileHover={!ann.isEditing ? { scale: 1.02 } : {}}
                    >
                      {ann.isEditing ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <textarea
                            value={ann.noteText ?? ""}
                            onChange={(e) =>
                              setAnnotations((prev) =>
                                prev.map((a) =>
                                  a.id === ann.id
                                    ? { ...a, noteText: e.target.value }
                                    : a,
                                ),
                              )
                            }
                            onKeyDown={(e) => handleNoteKeyDown(e, ann.id)}
                            placeholder="write your note..."
                            className="w-full bg-transparent border-none outline-none font-handwriting text-lg resize-none text-white/80"
                            rows={4}
                          />
                        </motion.div>
                      ) : (
                        <div className="relative group">
                          <motion.div
                            onClick={(e) => {
                              e.preventDefault();
                              setAnnotations(
                                annotations.map((a) =>
                                  a.id === ann.id ? { ...a, isEditing: true } : a,
                                ),
                              );
                            }}
                            whileHover={{ scale: 1.02 }}
                            className="cursor-pointer"
                          >
                            <p className="font-handwriting text-lg text-white/80 leading-relaxed">
                              {ann.noteText || "click to add note"}
                            </p>
                          </motion.div>
                          <motion.button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteNote(ann.id);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  ))}
            </AnimatePresence>

            {/* AI Highlights with Hover Tooltips */}
            <AnimatePresence>
              {annotations
                .filter((ann) => ann.type === "ai")
                .map((ann) => {
                  const highlightEl = document.getElementById(ann.highlightId);
                  const rect = highlightEl?.getBoundingClientRect();
                  const parsedExplanation = ann.aiExplanation ? (() => {
                    try {
                      return JSON.parse(ann.aiExplanation);
                    } catch {
                      return null;
                    }
                  })() : null;

                  return (
                    <div key={ann.id}>
                      {aiHover === ann.id && ann.aiExplanation && rect && (
                        <motion.div
                          className="fixed z-50 pointer-events-auto"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          style={{
                            left: Math.min(
                              Math.max(rect.left + rect.width / 2, 12),
                              (typeof window !== "undefined"
                                ? window.innerWidth
                                : 0) - 12,
                            ),
                            top: rect.top - 12,
                            transform: "translate(-50%, -100%)",
                          }}
                          onMouseEnter={() => {
                            if (aiHideTimer.current) {
                              clearTimeout(aiHideTimer.current);
                              aiHideTimer.current = null;
                            }
                            setAiHover(ann.id);
                          }}
                          onMouseLeave={() => {
                            if (aiHideTimer.current)
                              clearTimeout(aiHideTimer.current);
                            aiHideTimer.current = setTimeout(() => {
                              setAiHover(null);
                            }, 200);
                          }}
                        >
                          {ann.isLoading ? (
                            <div className="relative bg-background/90 text-foreground border border-border/50 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-3">
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-background/90 border-r border-b border-border/50" />
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating explanation...</span>
                              </div>
                            </div>
                          ) : (
                            parsedExplanation && (
                              <motion.div 
                                className="relative bg-background/90 text-foreground border border-border/50 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-3 max-w-sm max-h-[50vh] overflow-y-auto overscroll-contain"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                              >
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-background/90 border-r border-b border-border/50" />
                                <div className="space-y-3 text-sm font-light leading-relaxed">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                                      ELI5
                                    </div>
                                    <div>
                                      {parsedExplanation.eli5}
                                    </div>
                                  </div>
                                  <div className="border-t border-border/50 pt-3">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                                      Summary
                                    </div>
                                    <div>
                                      {parsedExplanation.summary}
                                    </div>
                                  </div>
                                  <div className="border-t border-border/50 pt-3">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                                      Without Jargon
                                    </div>
                                    <div>
                                      {parsedExplanation.jargon}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </div>
  );
}
