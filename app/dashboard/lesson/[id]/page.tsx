"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams} from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Play,
  Sparkles,
  BookOpen,
  Youtube,
  ExternalLink,
  Loader2,
  AlertCircle,
  Lightbulb,
  CheckSquare,
  CheckCircle,
  Target,
  Printer,
  ArrowDown,
  ArrowUp,
  Shuffle,
  X,
} from "lucide-react";
import { AddEntryModal } from "@/components/journal/add-entry-modal";
import { ObjectiveList } from "@/components/lesson/objective-list";
import { QuizSection } from "@/components/lesson/quiz-section";
import { LessonChat } from "@/components/lesson/lesson-chat";
import { cn } from "@/lib/utils";
import type { FullLessonContent, ActivityType } from "@/lib/lessonGenerator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Objective {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

interface LessonData {
  id: string;
  subject: string;
  topic: string;
  status: string;
  durationMins: number;
  startedAt: string | null;
  completedAt: string | null;
  child: {
    id: string;
    name: string;
    age: number | null;
    yearGroup: string | null;
    learningStyle: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "bg-blue-100 text-blue-700",
  maths: "bg-blue-100 text-blue-700",
  english: "bg-violet-100 text-violet-700",
  science: "bg-emerald-100 text-emerald-700",
  history: "bg-amber-100 text-amber-700",
  geography: "bg-teal-100 text-teal-700",
  art: "bg-pink-100 text-pink-700",
  music: "bg-purple-100 text-purple-700",
  "religious studies": "bg-indigo-100 text-indigo-700",
  re: "bg-indigo-100 text-indigo-700",
  pe: "bg-orange-100 text-orange-700",
  computing: "bg-cyan-100 text-cyan-700",
};

const SUBJECT_DOT_COLORS: Record<string, string> = {
  mathematics: "bg-blue-500",
  maths: "bg-blue-500",
  english: "bg-violet-500",
  science: "bg-emerald-500",
  history: "bg-amber-500",
  geography: "bg-teal-500",
  art: "bg-pink-500",
  music: "bg-purple-500",
  "religious studies": "bg-indigo-500",
  re: "bg-indigo-500",
  pe: "bg-orange-500",
  computing: "bg-cyan-500",
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  "Hands-on": "bg-emerald-100 text-emerald-700",
  Drawing: "bg-pink-100 text-pink-700",
  Worksheet: "bg-blue-100 text-blue-700",
  Discussion: "bg-amber-100 text-amber-700",
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  "Hands-on": "✋",
  Drawing: "🎨",
  Worksheet: "📝",
  Discussion: "💬",
};

function subjectBadge(subject: string) {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "bg-brand-mint text-brand-green-deep";
}

function subjectDot(subject: string) {
  return SUBJECT_DOT_COLORS[subject.toLowerCase()] ?? "bg-brand-green";
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-5",
        accent
          ? "bg-brand-mint/40 border-brand-green/25"
          : "bg-white border-[hsl(var(--border))]"
      )}
    >
      <h2 className="font-display font-semibold text-brand-green-deep flex items-center gap-2 mb-4">
        <span className="text-brand-green">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [content, setContent] = useState<FullLessonContent | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [phase, setPhase] = useState<"loading" | "generating" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // Which refine intent is currently in-flight, if any. Drives the spinner
  // on individual refine buttons and disables the others so the user can't
  // queue up overlapping AI calls.
  const [refining, setRefining] = useState<"easier" | "harder" | "alternative" | null>(null);
  const [refineError, setRefineError] = useState("");
  // Banner shown after a successful refine, explaining what changed. Auto
  // dismisses after a few seconds; user can also close it. Stays present
  // when the user wanders away from the tab so they don't miss it on return.
  const [refineNotice, setRefineNotice] = useState<{
    intent: "easier" | "harder" | "alternative";
  } | null>(null);

  async function refine(intent: "easier" | "harder" | "alternative") {
    setRefining(intent);
    setRefineError("");
    setRefineNotice(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Refine failed");
      }
      const { content: newContent, objectives: newObjectives } = await res.json();
      setContent(newContent as FullLessonContent);
      setObjectives(newObjectives ?? []);
      // Tell the user what just happened — they may have switched tabs
      // during the 10-15s wait and the silent swap is confusing.
      setRefineNotice({ intent });
      // Scroll back to top so the user sees the refreshed teaching guide.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setRefineError(err instanceof Error ? err.message : "Couldn't refine — try again.");
    } finally {
      setRefining(null);
    }
  }

  // ── Start / Mark complete / timer ────────────────────────────────────────
  // These used to live on the lesson preview card on the dashboard, but the
  // client asked to keep the preview clean (just "View lesson") and put the
  // start/complete flow inside the lesson itself.
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [masteryLevelUp, setMasteryLevelUp] = useState<{
    subject: string;
    previousLevel: string;
    newLevel: string;
  } | null>(null);

  useEffect(() => {
    if (lesson?.status !== "IN_PROGRESS" || !lesson.startedAt) return;
    const startedAtMs = new Date(lesson.startedAt).getTime();
    const tick = () => setTimerSeconds(Math.floor((Date.now() - startedAtMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lesson?.status, lesson?.startedAt]);

  function formatElapsed(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  async function handleStart() {
    if (!lesson) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/start`, { method: "POST" });
      if (res.ok) {
        setLesson((prev) =>
          prev ? { ...prev, status: "IN_PROGRESS", startedAt: new Date().toISOString() } : prev,
        );
      }
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleComplete() {
    if (!lesson) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLesson((prev) =>
          prev
            ? { ...prev, status: "COMPLETED", completedAt: new Date().toISOString() }
            : prev,
        );
        setShowJournalPrompt(true);
        if (data.mastery?.levelUp) {
          setMasteryLevelUp({
            subject: lesson.subject,
            previousLevel: data.mastery.previousLevel,
            newLevel: data.mastery.newLevel,
          });
        }
      }
    } finally {
      setStatusLoading(false);
    }
  }

  const REFINE_NOTICE_COPY: Record<
    "easier" | "harder" | "alternative",
    { title: string; body: string }
  > = {
    easier: {
      title: "Made easier",
      body: "Simpler language, smaller steps, more scaffolding. Quiz now leans on recall.",
    },
    harder: {
      title: "Made harder",
      body: "More advanced vocabulary, multi-step reasoning, fewer scaffolds. Quiz asks for application and analysis.",
    },
    alternative: {
      title: "A different take",
      body: "Same topic and difficulty, but with a new angle and only common household materials.",
    },
  };

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      // 1. Fetch lesson metadata
      const res = await fetch(`/api/lessons/${lessonId}`);
      if (!res.ok) throw new Error("Lesson not found");
      const { lesson: l, parsedContent } = await res.json();
      setLesson(l);

      // 2. If full content already exists, render immediately
      if (parsedContent?.teachingGuide?.length) {
        setContent(parsedContent as FullLessonContent);
        setObjectives(l.objectives ?? []);
        setPhase("ready");
        return;
      }

      // 3. Otherwise, generate full detail
      setPhase("generating");
      const genRes = await fetch(`/api/lessons/${lessonId}/generate-detail`, {
        method: "POST",
      });
      if (!genRes.ok) {
        const data = await genRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Generation failed");
      }
      const { content: fullContent, objectives: objs } = await genRes.json();
      setContent(fullContent as FullLessonContent);
      setObjectives(objs ?? []);
      setPhase("ready");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading / generating states ──────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-muted-foreground text-sm">Loading lesson…</span>
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
            Crafting your lesson…
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Planned is building a personalised teaching guide, activities,
            quiz, and day out idea. About 15 seconds.
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
            Couldn&apos;t load lesson
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

  if (!lesson || !content) return null;

  const { child } = lesson;
  const hasFaith = !!content.faithConnection;

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 print:max-w-full print:px-0 print:py-0 print:space-y-3">
      {/* Top bar: back + worksheet link.
          The old "Print worksheet" button screen-grabbed the lesson which
          the client called out as unhelpful — it now links to a dedicated
          /worksheet page that generates practice questions tailored to the
          lesson, with optional in-app completion for Premium users. */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-green transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <Link
          href={`/dashboard/lesson/${lessonId}/worksheet`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-deep bg-brand-mint hover:bg-brand-mint/80 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Worksheet
        </Link>
      </div>

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full",
              subjectBadge(lesson.subject)
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", subjectDot(lesson.subject))} />
            {lesson.subject}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {lesson.durationMins} min
          </span>
          {lesson.status === "COMPLETED" && (
            <span className="text-xs font-semibold text-brand-green bg-brand-mint px-2.5 py-1 rounded-full">
              ✓ Completed
            </span>
          )}
        </div>

        <h1 className="font-display text-xl font-bold text-brand-green-deep leading-snug mb-3">
          {content.title}
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {content.description}
        </p>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          {[
            child.name,
            child.age ? `Age ${child.age}` : null,
            child.yearGroup,
            child.learningStyle ? `${child.learningStyle} learner` : null,
          ]
            .filter(Boolean)
            .map((pill) => (
              <span
                key={pill}
                className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
              >
                {pill}
              </span>
            ))}
        </div>
      </div>

      {/* Start / Complete / Timer — print-hidden because it doesn't apply
          to the printed worksheet flow. */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between gap-3 print:hidden">
        {lesson.status === "PENDING" && (
          <>
            <p className="text-sm text-muted-foreground">
              Ready when you are. Tap start to begin the timer.
            </p>
            <button
              onClick={handleStart}
              disabled={statusLoading}
              className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {statusLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Start lesson
            </button>
          </>
        )}
        {lesson.status === "IN_PROGRESS" && (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 bg-brand-mint text-brand-green text-sm font-semibold px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                {formatElapsed(timerSeconds)}
              </span>
              <p className="text-xs text-muted-foreground hidden sm:block">In progress</p>
            </div>
            <button
              onClick={handleComplete}
              disabled={statusLoading}
              className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {statusLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Mark complete
            </button>
          </>
        )}
        {lesson.status === "COMPLETED" && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-brand-green" />
            <span className="text-brand-green-deep font-semibold">Completed</span>
            {lesson.startedAt && lesson.completedAt && (
              <span className="text-muted-foreground">
                · {Math.round((new Date(lesson.completedAt).getTime() - new Date(lesson.startedAt).getTime()) / 60000)} min
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mastery level up celebration banner */}
      {masteryLevelUp && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 print:hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Mastery Level Up in {masteryLevelUp.subject}!
              </p>
              <p className="text-[11px] text-emerald-700">
                {child.name} advanced from {masteryLevelUp.previousLevel.toLowerCase()} to{" "}
                <span className="font-semibold uppercase text-emerald-900">
                  {masteryLevelUp.newLevel}
                </span>
                .
              </p>
            </div>
          </div>
          <button
            onClick={() => setMasteryLevelUp(null)}
            className="w-6 h-6 flex items-center justify-center text-emerald-500 hover:text-emerald-700"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Journal prompt — shown after marking complete */}
      {showJournalPrompt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Add a note to {child.name}&apos;s journal?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowJournalModal(true)}
              className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Add note
            </button>
            <button
              onClick={() => setShowJournalPrompt(false)}
              className="w-6 h-6 flex items-center justify-center text-amber-500 hover:text-amber-700"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {showJournalModal && (
        <AddEntryModal
          childId={child.id}
          childName={child.name}
          prefill={{
            lessonId,
            subject: lesson.subject,
            topic: content.title ?? lesson.topic,
          }}
          onClose={() => setShowJournalModal(false)}
          onSaved={() => {
            setShowJournalModal(false);
            setShowJournalPrompt(false);
          }}
        />
      )}

      {/* Refine bar — re-generate the lesson with adjusted difficulty or
          a different angle when this version didn't land. Hidden in print. */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-4 py-3 space-y-2 print:hidden">
        <p className="text-xs font-semibold text-brand-green-deep">
          Doesn&apos;t quite fit? Adjust this lesson:
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "easier",      label: "Make easier",      icon: ArrowDown },
            { id: "harder",      label: "Make harder",      icon: ArrowUp },
            { id: "alternative", label: "Another option",   icon: Shuffle },
          ] as const).map(({ id, label, icon: Icon }) => {
            const isThisOne = refining === id;
            const disabled = refining !== null;
            return (
              <button
                key={id}
                onClick={() => refine(id)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                  disabled
                    ? "border-[hsl(var(--border))] text-muted-foreground/60 cursor-not-allowed"
                    : "border-brand-green/30 text-brand-green hover:bg-brand-mint hover:border-brand-green/50"
                )}
              >
                {isThisOne ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                {label}
              </button>
            );
          })}
        </div>
        {refineError && (
          <p className="text-xs text-destructive">{refineError}</p>
        )}
        {refineNotice && (
          <div className="mt-2 bg-brand-mint/40 border border-brand-green/30 rounded-lg px-3 py-2 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-green mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-green-deep">
                {REFINE_NOTICE_COPY[refineNotice.intent].title}
              </p>
              <p className="text-xs text-brand-green-deep/80 leading-relaxed">
                {REFINE_NOTICE_COPY[refineNotice.intent].body}
              </p>
            </div>
            <button
              onClick={() => setRefineNotice(null)}
              className="text-[10px] font-semibold text-brand-green hover:text-brand-green-deep uppercase tracking-wide shrink-0 px-1.5"
              aria-label="Dismiss"
            >
              Got it
            </button>
          </div>
        )}
      </div>

      {/* Learning objectives */}
      <Section icon={<Target className="w-4 h-4" />} title="Learning Objectives">
        <ObjectiveList lessonId={lessonId} objectives={objectives} />
      </Section>

      {/* Teaching guide */}
      <Section icon={<BookOpen className="w-4 h-4" />} title="Teaching Guide">
        <div className="space-y-4">
          {content.teachingGuide.map((step) => (
            <div key={step.step} className="flex gap-3.5">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {step.step}
                </div>
                {step.step < content.teachingGuide.length && (
                  <div className="w-px flex-1 bg-brand-green/20 mt-1.5" />
                )}
              </div>
              <div className="pb-4">
                <p className="font-semibold text-sm text-brand-green-deep mb-1">
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.instructions}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Activities */}
      <Section icon={<Play className="w-4 h-4" />} title="Activities">
        <div className="space-y-3">
          {content.activities.map((activity, i) => {
            const type = activity.type as ActivityType;
            return (
              <div
                key={i}
                className="rounded-xl border border-[hsl(var(--border))] px-4 py-4"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1",
                      ACTIVITY_COLORS[type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {ACTIVITY_ICONS[type] ?? "•"} {type}
                  </span>
                  {activity.durationMins && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {activity.durationMins} min
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-brand-green-deep mb-1">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activity.description}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Video resources */}
      {content.videoResources?.length > 0 && (
        <Section icon={<Youtube className="w-4 h-4" />} title="Video Resources">
          <div className="space-y-2.5">
            {content.videoResources.map((v, i) => (
              <a
                key={i}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-brand-mint/40 border border-transparent hover:border-brand-green/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <Youtube className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-green-deep truncate">
                    {v.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Search: {v.searchQuery}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-brand-green shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Faith connection */}
      {hasFaith && content.faithConnection && (
        <div className="rounded-2xl bg-brand-mint/50 border border-brand-green/25 px-5 py-5">
          <h2 className="font-display font-semibold text-brand-green-deep flex items-center gap-2 mb-4">
            <span>🌙</span> Faith Connection
          </h2>

          {content.faithConnection.arabicText && (
            <p
              dir="rtl"
              className="text-right font-arabic text-xl text-brand-green-deep leading-loose mb-3 bg-white/60 rounded-xl px-4 py-3"
            >
              {content.faithConnection.arabicText}
            </p>
          )}

          <div className="space-y-2.5">
            <div className="flex gap-2.5 items-start">
              <span className="text-xs font-bold text-brand-green uppercase tracking-wide shrink-0 mt-0.5">
                Reference
              </span>
              <span className="text-sm text-brand-green-deep font-medium">
                {content.faithConnection.reference}
              </span>
            </div>

            {content.faithConnection.translation && (
              <div className="flex gap-2.5 items-start">
                <span className="text-xs font-bold text-brand-green uppercase tracking-wide shrink-0 mt-0.5">
                  Translation
                </span>
                <span className="text-sm text-brand-green-deep/80 italic leading-relaxed">
                  &ldquo;{content.faithConnection.translation}&rdquo;
                </span>
              </div>
            )}

            <div className="bg-white/60 rounded-xl px-4 py-3 mt-1">
              <p className="text-sm text-brand-green-deep leading-relaxed">
                {content.faithConnection.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Day out */}
      {content.dayOut && (
        <Section icon={<MapPin className="w-4 h-4" />} title="Day Out Idea">
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-brand-green-deep text-sm">
                  {content.dayOut.venueName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {content.dayOut.address}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {content.dayOut.description}
            </p>
          </div>
        </Section>
      )}

      {/* Quiz */}
      {content.quiz?.length > 0 && (
        <Section icon={<Lightbulb className="w-4 h-4" />} title="Quick Quiz">
          <QuizSection questions={content.quiz} />
        </Section>
      )}

      {/* Bottom padding */}
      <div className="h-4" />

      {/* Floating Ask-AI button — context-aware to this lesson */}
      <LessonChat lessonId={lessonId} />
    </div>
  );
}
