"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, and `inline code`.
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting by code tokens, bold tokens, or italic tokens
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length > 1) {
      return (
        <code
          key={index}
          className="bg-muted/80 text-brand-green-deep px-1.5 py-0.5 rounded text-xs font-mono font-medium border border-[hsl(var(--border))]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length > 3) {
      return (
        <strong key={index} className="font-semibold text-brand-green-deep">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={index} className="italic text-brand-green-deep/90">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{token}</span>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-xs shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/80 border-b border-slate-700 text-[11px] font-mono text-slate-400">
        <span>{lang || "code"}</span>
        <button
          onClick={copyCode}
          type="button"
          className="inline-flex items-center gap-1 hover:text-slate-200 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface Block {
  type: "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "quote" | "code";
  text?: string;
  items?: string[];
  lang?: string;
  code?: string;
}

function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
        codeLines = [];
        inCodeBlock = false;
        codeLang = "";
      } else {
        if (currentList) {
          blocks.push(currentList);
          currentList = null;
        }
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "quote", text: trimmed.slice(2) });
      continue;
    }

    // Unordered list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    blocks.push({ type: "p", text: trimmed });
  }

  if (inCodeBlock) {
    blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
  }
  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

export function MarkdownRenderer({
  content,
  isStreaming = false,
  className,
}: MarkdownRendererProps) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={cn(
        "text-sm leading-relaxed space-y-2.5 text-brand-green-deep break-words",
        className
      )}
    >
      {blocks.map((block, index) => {
        const isLastBlock = index === blocks.length - 1;

        switch (block.type) {
          case "h1":
            return (
              <h2
                key={index}
                className="font-display font-bold text-base text-brand-green-deep mt-3 mb-1.5"
              >
                {renderInline(block.text || "")}
                {isStreaming && isLastBlock && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                )}
              </h2>
            );
          case "h2":
            return (
              <h3
                key={index}
                className="font-display font-bold text-sm sm:text-base text-brand-green-deep mt-2.5 mb-1"
              >
                {renderInline(block.text || "")}
                {isStreaming && isLastBlock && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                )}
              </h3>
            );
          case "h3":
            return (
              <h4
                key={index}
                className="font-display font-semibold text-sm text-brand-green-deep mt-2 mb-1"
              >
                {renderInline(block.text || "")}
                {isStreaming && isLastBlock && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                )}
              </h4>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-3 border-brand-green/70 bg-brand-mint/20 pl-3 py-1.5 my-2 rounded-r-lg italic text-brand-green-deep/90 text-xs sm:text-sm"
              >
                {renderInline(block.text || "")}
                {isStreaming && isLastBlock && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                )}
              </blockquote>
            );
          case "code":
            return <CodeBlock key={index} code={block.code || ""} lang={block.lang || ""} />;
          case "ul":
            return (
              <ul key={index} className="space-y-1.5 my-2 pl-1">
                {(block.items || []).map((item, itemIdx) => {
                  const isLastItem = isLastBlock && itemIdx === (block.items || []).length - 1;
                  return (
                    <li key={itemIdx} className="flex items-start gap-2.5 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0 mt-2" />
                      <span className="flex-1">
                        {renderInline(item)}
                        {isStreaming && isLastItem && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="space-y-1.5 my-2 pl-1">
                {(block.items || []).map((item, itemIdx) => {
                  const isLastItem = isLastBlock && itemIdx === (block.items || []).length - 1;
                  return (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm">
                      <span className="text-xs font-bold text-brand-green font-mono shrink-0 w-4 text-right pt-0.5">
                        {itemIdx + 1}.
                      </span>
                      <span className="flex-1">
                        {renderInline(item)}
                        {isStreaming && isLastItem && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={index} className="text-sm leading-relaxed">
                {renderInline(block.text || "")}
                {isStreaming && isLastBlock && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green translate-y-0.5 animate-pulse rounded-xs" />
                )}
              </p>
            );
        }
      })}

      {/* Pulsing cursor if content is still completely empty during streaming */}
      {isStreaming && blocks.length === 0 && (
        <div className="flex items-center gap-1.5 py-1">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-green animate-ping" />
          <span className="text-xs text-muted-foreground animate-pulse">Thinking...</span>
        </div>
      )}
    </div>
  );
}
