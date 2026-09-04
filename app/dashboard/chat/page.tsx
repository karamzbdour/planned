"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  AlertCircle,
  Lock,
  Sparkles,
  Trash2,
  MessageCircle,
  Copy,
  Check,
  Square,
  ArrowDown,
  BookOpen,
  Compass,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

type Phase = "loading" | "ready" | "paywall" | "error";

interface PromptCard {
  icon: typeof Lightbulb;
  category: string;
  prompt: string;
}

const PROMPT_CARDS: PromptCard[] = [
  {
    icon: Compass,
    category: "Maths Concept",
    prompt: "Can you explain long division using a practical visual analogy?",
  },
  {
    icon: Lightbulb,
    category: "Creative Activity",
    prompt: "Suggest an engaging, hands-on science experiment using everyday kitchen ingredients.",
  },
  {
    icon: BookOpen,
    category: "Literacy & Reading",
    prompt: "How can I help a reluctant writer build confidence with story writing?",
  },
  {
    icon: GraduationCap,
    category: "Lesson Adaptation",
    prompt: "How can I adapt a 45-minute lesson into a 20-minute active learning challenge?",
  },
];

export default function ChatPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUserScrolledUpRef = useRef(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch("/api/chat");
      if (res.status === 403) {
        setPhase("paywall");
        return;
      }
      if (!res.ok) throw new Error("Couldn't load chat");
      const json = await res.json();
      setMessages(json.messages ?? []);
      setPhase("ready");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle scroll detection for smart auto-scrolling
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isScrolledUp = distanceToBottom > 80;
    isUserScrolledUpRef.current = isScrolledUp;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll when messages or streaming tokens change (unless user scrolled up)
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
      });
    }
  }, [messages, isStreaming]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 160);
    textarea.style.height = `${newHeight}px`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    setIsStreaming(true);
    setErrorMsg("");
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const tempUserId = `tmp-user-${Date.now()}`;
    const tempAssistantId = `tmp-asst-${Date.now()}`;
    setStreamingMessageId(tempAssistantId);

    // Optimistically append user message and streaming assistant placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom("smooth"), 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 403) {
          setPhase("paywall");
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserId && m.id !== tempAssistantId)
          );
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't send message");
      }

      if (!res.body) {
        throw new Error("No response body received from server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId ? { ...m, content: accumulated } : m
          )
        );
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return; // User intentionally stopped generation
      }
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      // Remove placeholder assistant message if empty
      setMessages((prev) =>
        prev.filter((m) => !(m.id === tempAssistantId && !m.content.trim()))
      );
      setInput(trimmed);
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  }

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
  }

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function clearHistory() {
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([]);
    } catch {
      /* ignore */
    }
  }

  function formatTime(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  // ── Paywall State ────────────────────────────────────────────────────────
  if (phase === "paywall") {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center shadow-xs">
          <Lock className="w-8 h-8 text-brand-green" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Homeschool AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get instant help adapting lessons, clarifying curriculum concepts, and
            personalising activities for your children — powered by our high-speed,
            multi-model homeschool tutor.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 rounded-xl planned-gradient flex items-center justify-center shadow-xs animate-pulse">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-muted-foreground text-sm font-medium">
          Loading homeschool assistant…
        </span>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 gap-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-green-deep mb-1">
            Couldn&apos;t load conversation
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
          <button
            onClick={load}
            className="bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-green-deep transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready State (Modern Chat UI) ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-0rem)] max-w-3xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[hsl(var(--border))] bg-white/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl planned-gradient flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-sm sm:text-base text-brand-green-deep leading-tight">
                Homeschool AI Assistant
              </h1>
              <Badge variant="success" className="text-[10px] px-2 py-0 h-4 font-medium">
                Premium
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] text-muted-foreground">
                Context-aware to your family & children
              </p>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Clear conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear chat</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 relative"
      >
        {messages.length === 0 ? (
          /* Empty hero state */
          <div className="py-6 sm:py-10 max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl planned-gradient-soft border border-brand-green/20 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-brand-green-deep">
                How can I help with your homeschool day?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                I know your children&apos;s year groups, your curriculum framework, and
                faith preferences. Ask anything from lesson adaptations to teaching
                techniques.
              </p>
            </div>

            {/* Prompt suggestions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROMPT_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(card.prompt)}
                    className="flex flex-col text-left p-3.5 rounded-2xl bg-white border border-[hsl(var(--border))] hover:border-brand-green/40 hover:bg-brand-mint/20 transition-all duration-200 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-1.5 rounded-lg bg-brand-mint/60 text-brand-green-deep group-hover:bg-brand-green group-hover:text-white transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[11px] font-semibold text-brand-green uppercase tracking-wide">
                        {card.category}
                      </span>
                    </div>
                    <p className="text-xs text-brand-green-deep/90 leading-snug line-clamp-2">
                      {card.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat message stream */
          messages.map((m) => {
            const isUser = m.role === "user";
            const isMessageStreaming = isStreaming && m.id === streamingMessageId;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 items-start animate-in fade-in duration-200",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {/* Assistant avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl planned-gradient flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "flex flex-col group",
                    isUser ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start max-w-[92%] sm:max-w-[88%]"
                  )}
                >
                  {/* Message body */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl transition-all",
                      isUser
                        ? "bg-brand-green text-white shadow-xs rounded-tr-xs text-sm leading-relaxed whitespace-pre-wrap"
                        : "bg-white border border-[hsl(var(--border))] rounded-tl-xs shadow-2xs text-brand-green-deep w-full"
                    )}
                  >
                    {isUser ? (
                      m.content
                    ) : (
                      <MarkdownRenderer
                        content={m.content}
                        isStreaming={isMessageStreaming}
                      />
                    )}
                  </div>

                  {/* Message footer with timestamp and copy button */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-muted-foreground/70">
                    <span>{formatTime(m.createdAt)}</span>
                    {!isUser && m.content && !isMessageStreaming && (
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="inline-flex items-center gap-1 hover:text-brand-green-deep transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} className="h-2" />

        {/* Floating scroll to bottom button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-white border border-[hsl(var(--border))] shadow-md text-brand-green-deep flex items-center justify-center hover:bg-muted transition-all"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error notification banner */}
      {errorMsg && (
        <div className="mx-4 sm:mx-6 mb-2 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg("")}
            className="text-[11px] underline font-medium hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Modern Composer input area */}
      <div className="p-3 sm:p-4 border-t border-[hsl(var(--border))] bg-white/90 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="relative"
        >
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white shadow-xs focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20 transition-all p-2 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask a question about lessons, child learning, or curriculum… (Enter to send)"
              rows={1}
              maxLength={4000}
              className="flex-1 bg-transparent px-2.5 py-1 text-sm text-brand-green-deep placeholder:text-muted-foreground/60 focus:outline-none resize-none min-h-[40px] max-h-36 leading-relaxed"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="shrink-0 w-9 h-9 rounded-xl bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 w-9 h-9 rounded-xl bg-brand-green hover:bg-brand-green-deep disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-muted-foreground/60">
            <span>Enter to send • Shift+Enter for new line</span>
            <span>Planned AI Assistant</span>
          </div>
        </form>
      </div>
    </div>
  );
}
