"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface LessonChatProps {
  /** Lesson the panel should scope the assistant to. */
  lessonId: string;
}

/**
 * Floating chat panel scoped to a specific lesson. Posts the lessonId
 * alongside every message so the API can stitch the lesson plan into the
 * system prompt — the assistant can then answer "explain step 2" or
 * "what materials does this need?" without the parent re-pasting context.
 *
 * Premium-only. Non-Premium parents see a small upgrade card inside the
 * open panel.
 */
export function LessonChat({ lessonId }: LessonChatProps) {
  const [open, setOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lazy-load the conversation the first time the panel opens.
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.status === 403) {
        setPaywall(true);
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.messages ?? []);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open && !historyLoaded) loadHistory();
  }, [open, historyLoaded, loadHistory]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending, open]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setErrorMsg("");
    setInput("");

    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: trimmed }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, lessonId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setPaywall(true);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }
        throw new Error(body.error ?? "Couldn't send");
      }
      const json = await res.json();
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempId)
          .concat([json.userMessage, json.assistantMessage]),
      );
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setErrorMsg(err instanceof Error ? err.message : "Couldn't send");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating launcher — fixed bottom-right, hidden in print. Stays out
          of the way on mobile by sitting above the bottom nav. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold pl-3 pr-4 py-2.5 rounded-full shadow-lg shadow-brand-green/30 transition-colors print:hidden"
          aria-label="Open AI assistant"
        >
          <MessageCircle className="w-4 h-4" />
          Ask AI
        </button>
      )}

      {/* Slide-out / floating panel */}
      {open && (
        <div className="fixed inset-0 z-40 pointer-events-none print:hidden">
          {/* Backdrop on mobile */}
          <div
            className="absolute inset-0 bg-black/30 md:hidden pointer-events-auto"
            onClick={() => setOpen(false)}
          />
          {/* Panel — compact floating card in bottom-right to keep top-right timer HUD clear */}
          <div className="pointer-events-auto absolute bottom-0 right-0 w-full max-h-[75vh] rounded-t-2xl md:bottom-6 md:right-6 md:top-auto md:h-[480px] md:max-h-[calc(100vh-120px)] md:w-96 md:rounded-2xl bg-white border border-[hsl(var(--border))] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg planned-gradient flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-brand-green-deep text-sm leading-tight">
                    Ask about this lesson
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    The assistant has the full lesson plan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {paywall ? (
                <div className="text-center space-y-3 py-8">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center">
                    <Lock className="w-6 h-6 text-brand-green" />
                  </div>
                  <p className="font-display font-bold text-brand-green-deep text-sm">
                    Premium feature
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Upgrade to ask the AI tutor questions about each lesson.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    See plans
                  </Link>
                </div>
              ) : !historyLoaded ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Try asking…
                  </p>
                  {[
                    "Can you explain the warm-up step in simpler words?",
                    "What materials do I need for this lesson?",
                    "Suggest a shorter activity if we have only 20 minutes",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-brand-mint/40 text-brand-green-deep transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-brand-green text-white rounded-br-sm"
                          : "bg-muted/50 text-brand-green-deep rounded-bl-sm",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking…
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-[11px] text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Composer */}
            {!paywall && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="border-t border-[hsl(var(--border))] px-3 py-2.5 flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask about this lesson…"
                  rows={1}
                  maxLength={4000}
                  disabled={sending}
                  className="flex-1 bg-muted/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green resize-none max-h-32"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="shrink-0 w-9 h-9 rounded-xl bg-brand-green hover:bg-brand-green-deep disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
