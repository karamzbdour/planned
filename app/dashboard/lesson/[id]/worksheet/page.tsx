"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Printer,
  Save,
  Check,
  Lock,
  Pencil,
} from "lucide-react";
import { useSetBreadcrumbTitle, useBreadcrumbs } from "@/contexts/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import type { WorksheetContent, WorksheetQuestion } from "@/lib/worksheetGenerator";

type Phase = "loading" | "empty" | "generating" | "ready" | "error" | "paywall";

interface ApiResponse {
  tier: "FREE" | "BASIC" | "PREMIUM";
  worksheet: WorksheetContent | null;
  answers: Record<string, string | number>;
  lessonTitle: string;
}

export default function WorksheetPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const { setBreadcrumbOverride } = useBreadcrumbs();
  useSetBreadcrumbTitle("Worksheet", "worksheet");

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/lessons/${lessonId}/worksheet`);
      if (res.status === 403) {
        setPhase("paywall");
        return;
      }
      if (!res.ok) throw new Error("Could not load worksheet");
      const json: ApiResponse = await res.json();
      setData(json);
      if (json.lessonTitle) {
        setBreadcrumbOverride(lessonId, json.lessonTitle);
      }
      setAnswers(json.answers ?? {});
      setPhase(json.worksheet ? "ready" : "empty");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [lessonId, setBreadcrumbOverride]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setPhase("generating");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/lessons/${lessonId}/worksheet`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Generation failed");
      }
      const json = await res.json();
      setData((prev) => prev ? { ...prev, worksheet: json.worksheet, answers: {} } : prev);
      setAnswers({});
      setPhase("ready");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function saveAnswers() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/worksheet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Paywall ──────────────────────────────────────────────────────────────
  if (phase === "paywall") {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center">
          <Lock className="w-7 h-7 text-brand-green" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Worksheets are a Basic feature
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generate personalised practice worksheets for every lesson — print
            them out or, on Premium, fill them in directly in the app.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          See plans
        </Link>
      </div>
    );
  }

  // ── Loading / generating ─────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-muted-foreground text-sm">Loading worksheet…</span>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl planned-gradient flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-brand-green/40 animate-ping" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-green-deep mb-1">
            Building the worksheet…
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Tailoring questions to this lesson&apos;s objectives. About 10 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-green-deep mb-1">
            Couldn&apos;t load worksheet
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

  // ── Empty: no worksheet generated yet ────────────────────────────────────
  if (phase === "empty") {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center">
          <Pencil className="w-7 h-7 text-brand-green" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            No worksheet yet
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generate a personalised practice worksheet based on this lesson&apos;s
            objectives. {data?.tier === "PREMIUM"
              ? "You can fill it in directly in the app or print it."
              : "Print it out for your child to complete on paper."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/dashboard/lesson/${lessonId}`}
            className="text-sm text-muted-foreground hover:text-brand-green-deep px-3 py-2 transition-colors"
          >
            ← Back to lesson
          </Link>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate worksheet
          </button>
        </div>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────
  const ws = data!.worksheet!;
  const interactive = data!.tier === "PREMIUM";

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 print:max-w-full print:px-0 print:py-0">
      {/* Top bar — hidden when printing */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Breadcrumbs className="py-0 flex-1 min-w-0" />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={generate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-green hover:text-brand-green-deep bg-brand-mint hover:bg-brand-mint/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Regenerate
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-green hover:text-brand-green-deep bg-brand-mint hover:bg-brand-mint/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green mb-1">
          Worksheet
        </p>
        <h1 className="font-display text-xl font-bold text-brand-green-deep leading-snug mb-2">
          {ws.title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {ws.instructions}
        </p>
      </div>

      {/* Questions */}
      <ol className="space-y-4">
        {ws.questions.map((q, i) => (
          <li
            key={i}
            className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-4"
          >
            <div className="flex gap-3">
              <span className="font-display font-bold text-brand-green-deep shrink-0 w-7 h-7 rounded-full bg-brand-mint flex items-center justify-center text-sm">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-green-deep mb-2.5 leading-relaxed">
                  {q.prompt}
                </p>
                <QuestionInput
                  question={q}
                  index={i}
                  interactive={interactive}
                  value={answers[String(i)]}
                  onChange={(v) =>
                    setAnswers((prev) => ({ ...prev, [String(i)]: v }))
                  }
                />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Save bar — Premium only */}
      {interactive && (
        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-3 flex items-center justify-between gap-3 print:hidden">
          <p className="text-xs text-muted-foreground">
            Your answers save to this lesson — you can come back any time.
          </p>
          <button
            onClick={saveAnswers}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? "Saved" : "Save answers"}
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

// ─── Per-question input ──────────────────────────────────────────────────────

function QuestionInput({
  question,
  index,
  interactive,
  value,
  onChange,
}: {
  question: WorksheetQuestion;
  index: number;
  interactive: boolean;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
}) {
  if (question.type === "drawing") {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-[hsl(var(--border))] rounded-xl px-4 py-8 text-center text-xs text-muted-foreground italic">
        ✏️ Draw your answer on paper
      </div>
    );
  }

  if (question.type === "multiple-choice" && question.options) {
    const selected = typeof value === "number" ? value : -1;
    return (
      <div className="space-y-1.5">
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              interactive
                ? "cursor-pointer hover:bg-muted"
                : "cursor-default"
            } ${
              selected === i
                ? "border-brand-green bg-brand-mint/40 text-brand-green-deep"
                : "border-[hsl(var(--border))]"
            }`}
          >
            <input
              type="radio"
              name={`q-${index}`}
              checked={selected === i}
              onChange={() => onChange(i)}
              disabled={!interactive}
              className="accent-brand-green"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  // short-answer / fill-blank
  return (
    <textarea
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={!interactive}
      placeholder={interactive ? "Type your answer…" : "_____________________________"}
      rows={2}
      className="w-full bg-muted/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green resize-none"
    />
  );
}
