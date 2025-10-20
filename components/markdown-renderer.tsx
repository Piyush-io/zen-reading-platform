"use client";

import { useEffect, useRef, useMemo, memo } from "react";
import type React from "react";

// ============================================================================
// Types & Constants
// ============================================================================

interface ImageData {
  index: number;
  base64?: string;
  storageId?: string;
  url?: string;
  id: string;
}

interface MarkdownRendererProps {
  content: string;
  images?: ImageData[];
}

interface TableData {
  headerRow: string[];
  dataRows: string[][];
  isDegenerate: boolean;
}

interface InlinePattern {
  regex: RegExp;
  render: (match: string, groups: string[]) => React.ReactElement | string;
  priority: number; // Lower = higher priority
}

const TABLE_CONFIG = {
  MAX_COLUMNS: 12,
  SINGLE_CHAR_RATIO: 0.6,
  MIN_ROWS: 2,
} as const;

const KATEX_CONFIG = {
  throwOnError: false,
  strict: false,
  trust: false,
} as const;

const IMAGE_MIME_TYPES: Record<string, string> = {
  "/9j/": "image/jpeg",
  iVBORw0KGgo: "image/png",
  R0lGOD: "image/gif",
  UklGR: "image/webp",
} as const;

const HEADING_PATTERNS = [
  { prefix: "# ", level: 1, className: "ad-h1 mt-16 mb-8" },
  { prefix: "## ", level: 2, className: "ad-h2 mt-12 mb-6" },
  { prefix: "### ", level: 3, className: "ad-h3 mt-10 mb-4" },
  { prefix: "#### ", level: 4, className: "ad-h4 mt-8 mb-3" },
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = (text: string): string =>
  `heading-${text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")}`;

const isTableLine = (line: string): boolean =>
  line.startsWith("|") && line.endsWith("|") && line.length > 2;

const detectImageMimeType = (base64: string): string => {
  for (const [prefix, mimeType] of Object.entries(IMAGE_MIME_TYPES)) {
    if (base64.startsWith(prefix)) return mimeType;
  }
  return "image/png";
};

const getImageSrc = (image: ImageData): string => {
  // If URL is already provided (from storage), use it
  if (image.url) return image.url;
  
  // Legacy: handle base64 format
  const b64 = (image.base64 || "").trim();
  if (!b64) return "";
  if (b64.startsWith("data:")) return b64;

  const mimeType = detectImageMimeType(b64);
  return `data:${mimeType};base64,${b64}`;
};

const findImage = (
  images: ImageData[],
  index?: number,
  idCandidate?: string,
): ImageData | null => {
  if (idCandidate) {
    const core = idCandidate.replace(/\.(?:jpe?g|png|gif|webp)$/i, "");
    const byId = images.find(
      (img) => img.id?.toLowerCase() === core.toLowerCase(),
    );
    if (byId) return byId;
  }

  if (typeof index === "number" && !Number.isNaN(index)) {
    const byIndex = images.find((img) => img.index === index);
    if (byIndex) return byIndex;
  }

  return null;
};

const cleanKatexText = (tex: string): string =>
  tex.replace(/[\u00A0\u200B\u2061\u2062\u2063\u2064]/g, "");

// ============================================================================
// Table Parsing & Rendering
// ============================================================================

const parseTableData = (lines: string[]): TableData | null => {
  if (lines.length < TABLE_CONFIG.MIN_ROWS) return null;

  const rows = lines.map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );

  const hasSeparator = rows[1]?.every((cell) => /^:?-+:?$/.test(cell.trim()));
  const headerRow = rows[0];
  const dataRows = hasSeparator ? rows.slice(2) : rows.slice(1);

  // Detect degenerate OCR tables
  const totalCells = rows.reduce((acc, r) => acc + r.length, 0) || 1;
  const singleCharCells = rows.reduce(
    (acc, r) => acc + r.filter((c) => c.length <= 1).length,
    0,
  );
  const maxCols = Math.max(...rows.map((r) => r.length), 0);

  const isDegenerate =
    maxCols > TABLE_CONFIG.MAX_COLUMNS ||
    singleCharCells / totalCells > TABLE_CONFIG.SINGLE_CHAR_RATIO;

  return { headerRow, dataRows, isDegenerate };
};

const TableRenderer = memo(
  ({
    lines,
    tableKey,
    images,
  }: {
    lines: string[];
    tableKey: number;
    images: ImageData[];
  }) => {
    const tableData = parseTableData(lines);
    if (!tableData) return null;

    const { headerRow, dataRows, isDegenerate } = tableData;

    if (isDegenerate) {
      return (
        <div key={`table-${tableKey}`} className="my-6">
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            {dataRows.map((row, i) => (
              <p key={i} className="ad-table-td text-muted-foreground">
                {processInlineFormatting(
                  row.join(" ").replace(/\s+/g, " ").trim(),
                  images,
                )}
              </p>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        key={`table-${tableKey}`}
        className="my-6 -mx-6 px-6 overflow-x-auto"
      >
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b border-border">
              {headerRow.map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-medium ad-table-th whitespace-normal break-words align-top text-foreground"
                >
                  {processInlineFormatting(cell, images)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 align-top">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-3 ad-table-td whitespace-normal break-words align-top text-muted-foreground"
                  >
                    {processInlineFormatting(cell, images)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

TableRenderer.displayName = "TableRenderer";

// ============================================================================
// Block Element Renderers
// ============================================================================

const CodeBlock = memo(
  ({ code, blockKey, language }: { code: string; blockKey: number; language?: string }) => (
    <div key={blockKey} className="my-4 -mx-6 px-6 overflow-x-auto">
      <pre className="bg-muted/30 p-4 rounded-lg min-w-0" data-lang={language || undefined}>
        <code className={`ad-code font-mono block text-foreground ${language ? `language-${language}` : ""}`.trim()}>
          {code}
        </code>
      </pre>
    </div>
  ),
);

CodeBlock.displayName = "CodeBlock";

const Blockquote = memo(
  ({
    text,
    blockKey,
    images,
  }: {
    text: string;
    blockKey: number;
    images: ImageData[];
  }) => (
    <blockquote
      key={blockKey}
      className="border-l-4 border-muted pl-4 italic my-4 ad-quote text-muted-foreground"
    >
      {processInlineFormatting(text.replace(/^>\s*/, ""), images)}
    </blockquote>
  ),
);

Blockquote.displayName = "Blockquote";

const UnorderedList = memo(
  ({
    text,
    listKey,
    images,
  }: {
    text: string;
    listKey: number;
    images: ImageData[];
  }) => {
    const items = text.split("\n").filter((line) => /^[-*]\s/.test(line));

    return (
      <ul
        key={listKey}
        className="list-disc pl-6 space-y-2 my-3 ad-body text-muted-foreground"
      >
        {items.map((item, i) => (
          <li key={i}>
            {processInlineFormatting(item.replace(/^[-*]\s/, ""), images)}
          </li>
        ))}
      </ul>
    );
  },
);

UnorderedList.displayName = "UnorderedList";

const OrderedList = memo(
  ({
    text,
    listKey,
    images,
  }: {
    text: string;
    listKey: number;
    images: ImageData[];
  }) => {
    const items = text.split("\n").filter((line) => /^\d+\.\s/.test(line));

    return (
      <ol
        key={listKey}
        className="list-decimal pl-6 space-y-2 my-3 ad-body text-muted-foreground"
      >
        {items.map((item, i) => (
          <li key={i}>
            {processInlineFormatting(item.replace(/^\d+\.\s/, ""), images)}
          </li>
        ))}
      </ol>
    );
  },
);

OrderedList.displayName = "OrderedList";

// ============================================================================
// Inline Formatting
// ============================================================================

const createInlinePatterns = (images: ImageData[]): InlinePattern[] => {
  let keyCounter = 0;

  return [
    // Image placeholders - highest priority
    {
      priority: 1,
      regex: /\[(?:Image|Figure|Fig\.?)[\s\u00A0]*[:#]?[\s\u00A0]*(\d+)\]/gi,
      render: (_match: string, groups: string[]) => {
        const imageIndex = parseInt(groups[0] || "", 10);
        const image = findImage(images, imageIndex);

        if (image) {
          return (
            <img
              key={`img-${keyCounter++}`}
              src={getImageSrc(image)}
              alt={image.id}
              className="max-w-full h-auto rounded-lg my-4"
              loading="lazy"
              decoding="async"
            />
          );
        }
        return (
          <span
            key={`img-placeholder-${keyCounter++}`}
          >{`[Image ${groups[0] || "?"}]`}</span>
        );
      },
    },
    // OCR image format
    {
      priority: 2,
      regex: /!\[(?:img|image)-(\d+)\.(jpe?g|png|gif|webp)\]\(([^)]+)\)/gi,
      render: (_match: string, groups: string[]) => {
        const n = parseInt(groups[0] || "", 10);
        const url = groups[2] || "";
        const idCandidate = `img-${groups[0]}`;
        const image = findImage(images, n, idCandidate);

        if (image) {
          return (
            <img
              key={`img-${keyCounter++}`}
              src={getImageSrc(image)}
              alt={image.id}
              className="max-w-full h-auto rounded-lg my-4"
              loading="lazy"
              decoding="async"
            />
          );
        }

        return (
          <img
            key={`img-fallback-${keyCounter++}`}
            src={url}
            alt={idCandidate}
            className="max-w-full h-auto rounded-lg my-4"
            loading="lazy"
          />
        );
      },
    },
    // Standard markdown images
    {
      priority: 3,
      regex: /!\[([^\]]*)\]\(([^)]+)\)/g,
      render: (_match: string, groups: string[]) => {
        const alt = groups[0] || "";
        const url = groups[1] || "";
        const simple = url.split("?")[0].split("#")[0];
        const idMatch = simple.match(/^img-(\d+)\.(?:jpe?g|png|gif|webp)$/i);

        if (idMatch) {
          const n = parseInt(idMatch[1], 10);
          const idCandidate = simple.replace(/\.(?:jpe?g|png|gif|webp)$/i, "");
          const image = findImage(images, n, idCandidate);

          if (image) {
            return (
              <img
                key={`img-${keyCounter++}`}
                src={getImageSrc(image)}
                alt={alt || image.id}
                className="max-w-full h-auto rounded-lg my-4"
                loading="lazy"
              />
            );
          }
        }

        return (
          <img
            key={`img-${keyCounter++}`}
            src={url}
            alt={alt}
            className="max-w-full h-auto rounded-lg my-4"
            loading="lazy"
          />
        );
      },
    },
    // Block math
    {
      priority: 4,
      regex: /\$\$(.*?)\$\$/g,
      render: (match: string, _groups: string[]) => (
        <span key={`math-block-${keyCounter++}`} className="math-block">
          {match.slice(2, -2)}
        </span>
      ),
    },
    // Inline math
    {
      priority: 5,
      regex: /\$(.*?)\$/g,
      render: (match: string, _groups: string[]) => (
        <span key={`math-inline-${keyCounter++}`} className="math-inline">
          {match.slice(1, -1)}
        </span>
      ),
    },
    // Bold + italic
    {
      priority: 6,
      regex: /\*\*\*(.+?)\*\*\*/g,
      render: (match: string, _groups: string[]) => (
        <strong key={`bold-italic-${keyCounter++}`} className="italic">
          {match.slice(3, -3)}
        </strong>
      ),
    },
    // Bold
    {
      priority: 7,
      regex: /\*\*(.+?)\*\*/g,
      render: (match: string, _groups: string[]) => (
        <strong key={`bold-${keyCounter++}`}>{match.slice(2, -2)}</strong>
      ),
    },
    // Italic
    {
      priority: 8,
      regex: /\*(.+?)\*/g,
      render: (match: string, _groups: string[]) => (
        <em key={`italic-${keyCounter++}`}>{match.slice(1, -1)}</em>
      ),
    },
    // Inline code
    {
      priority: 9,
      regex: /`([^`]+)`/g,
      render: (match: string, _groups: string[]) => (
        <code
          key={`code-${keyCounter++}`}
          className="bg-muted/30 px-1.5 py-0.5 rounded ad-code font-mono text-foreground"
        >
          {match.slice(1, -1)}
        </code>
      ),
    },
    // Markdown links [text](url "title")
    {
      priority: 10,
      regex: /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      render: (_match: string, groups: string[]) => {
        const text = groups[0] || "";
        const href = groups[1] || "";
        const title = groups[2] || undefined;
        const isExternal = /^https?:\/\//i.test(href);
        return (
          <a
            key={`link-${keyCounter++}`}
            href={href}
            title={title}
            className="text-primary underline underline-offset-2 hover:opacity-90"
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
          >
            {text}
          </a>
        );
      },
    },
    // Autolink bare URLs
    {
      priority: 11,
      regex: /\bhttps?:\/\/[^\s)]+/g,
      render: (match: string, _groups: string[]) => {
        const href = match;
        return (
          <a
            key={`autolink-${keyCounter++}`}
            href={href}
            className="text-primary underline underline-offset-2 hover:opacity-90"
            target="_blank"
            rel="noopener noreferrer"
          >
            {href}
          </a>
        );
      },
    },
  ].sort((a, b) => a.priority - b.priority);
};

const processInlineFormatting = (
  text: string,
  images: ImageData[],
): (string | React.ReactElement)[] => {
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  const patterns = createInlinePatterns(images);

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      match: string;
      groups: string[];
      pattern: InlinePattern;
    } | null = null;

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const m = pattern.regex.exec(remaining);

      if (m && (earliestMatch === null || m.index < earliestMatch.index)) {
        earliestMatch = {
          index: m.index,
          match: m[0],
          groups: m.slice(1) as string[],
          pattern,
        };
      }
    }

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        parts.push(remaining.slice(0, earliestMatch.index));
      }

      parts.push(
        earliestMatch.pattern.render(earliestMatch.match, earliestMatch.groups),
      );
      remaining = remaining.slice(
        earliestMatch.index + earliestMatch.match.length,
      );
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts;
};

// ============================================================================
// Main Rendering Logic
// ============================================================================

const renderMarkdown = (
  md: string,
  images: ImageData[],
): React.ReactElement[] => {
  const cleanMd = md.replace(/[\u00A0\u200B\u2061\u2062\u2063\u2064]/g, "");
  const paragraphs = cleanMd.split("\n\n").filter((p) => p.trim().length > 0);
  const elements: React.ReactElement[] = [];
  let keyCounter = 0;

  let inTable = false;
  let accumTableLines: string[] = [];

  const flushTable = () => {
    if (accumTableLines.length > 0) {
      const tableElement = (
        <TableRenderer
          key={`table-${keyCounter++}`}
          lines={accumTableLines}
          tableKey={keyCounter}
          images={images}
        />
      );
      elements.push(tableElement);
    }
    inTable = false;
    accumTableLines = [];
  };

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    const lines = trimmed.split("\n").map((l) => l.trim());
    const isAllTableLines = lines.length > 0 && lines.every(isTableLine);

    if (isAllTableLines) {
      accumTableLines.push(...lines);
      inTable = true;
      return;
    }

    if (inTable) {
      flushTable();
    }

    const key = keyCounter++;

    // Headings
    for (const { prefix, level, className } of HEADING_PATTERNS) {
      if (trimmed.startsWith(prefix)) {
        const text = trimmed.slice(prefix.length);
        const id = generateId(text);
        switch (level) {
          case 1:
            elements.push(
              <h1 key={key} id={id} className={className}>
                {processInlineFormatting(text, images)}
              </h1>,
            );
            break;
          case 2:
            elements.push(
              <h2 key={key} id={id} className={className}>
                {processInlineFormatting(text, images)}
              </h2>,
            );
            break;
          case 3:
            elements.push(
              <h3 key={key} id={id} className={className}>
                {processInlineFormatting(text, images)}
              </h3>,
            );
            break;
          case 4:
          default:
            elements.push(
              <h4 key={key} id={id} className={className}>
                {processInlineFormatting(text, images)}
              </h4>,
            );
            break;
        }
        return;
      }
    }

    // Horizontal rule
    const hrNoSpaces = trimmed.replace(/\s+/g, "");
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(hrNoSpaces)) {
      elements.push(<hr key={key} className="my-6 border-border" />);
      return;
    }

    // Code blocks
    if (trimmed.startsWith("```") ) {
      const codeLines = trimmed.split("\n");
      const first = codeLines[0] || "```";
      const language = first.slice(3).trim() || undefined;
      const code = codeLines.slice(1, -1).join("\n");
      elements.push(<CodeBlock key={key} code={code} blockKey={key} language={language} />);
      return;
    }

    // Blockquotes
    if (trimmed.startsWith(">")) {
      elements.push(
        <Blockquote key={key} text={trimmed} blockKey={key} images={images} />,
      );
      return;
    }

    // Lists
    if (/^[-*]\s/.test(trimmed)) {
      elements.push(
        <UnorderedList
          key={key}
          text={trimmed}
          listKey={key}
          images={images}
        />,
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <OrderedList key={key} text={trimmed} listKey={key} images={images} />,
      );
      return;
    }

    // Default paragraph
    elements.push(
      <p key={key} className="ad-body my-3 text-muted-foreground">
        {processInlineFormatting(trimmed, images)}
      </p>,
    );
  });

  if (inTable) {
    flushTable();
  }

  return elements;
};

// ============================================================================
// Main Component
// ============================================================================

export function MarkdownRenderer({
  content,
  images = [],
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Render KaTeX equations
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const renderKatex = async () => {
      try {
        const katex = await import("katex");
        const container = containerRef.current;
        if (!container) return;

        const renderMath = (selector: string, displayMode: boolean) => {
          const elements = container.querySelectorAll(selector);
          elements.forEach((el) => {
            if (el.hasAttribute('data-katex-rendered')) return;
            
            const tex = cleanKatexText(el.textContent || "");
            try {
              katex.default.render(tex, el as HTMLElement, {
                ...KATEX_CONFIG,
                displayMode,
              });
              el.setAttribute('data-katex-rendered', 'true');
            } catch (e) {
              console.error(
                `KaTeX ${displayMode ? "block" : "inline"} render error:`,
                e,
              );
            }
          });
        };

        renderMath(".math-inline", false);
        renderMath(".math-block", true);
      } catch (error) {
        console.error("Failed to load KaTeX:", error);
      }
    };

    renderKatex();
  }, [content]);

  const renderedContent = useMemo(
    () => renderMarkdown(content, images),
    [content, images],
  );

  return (
    <div
      ref={containerRef}
      className="markdown-content article-content font-sans text-foreground"
    >
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
        integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+"
        crossOrigin="anonymous"
      />
      {renderedContent}
    </div>
  );
}
