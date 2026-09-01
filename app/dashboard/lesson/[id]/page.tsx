"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  MapPin,
  Play,
  Pause,
  Sparkles,
  BookOpen,
  Youtube,
  Loader2,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  Target,
  Printer,
  ArrowDown,
  ArrowUp,
  Shuffle,
  X,
} from "lucide-react";
import { useObject } from "@ai-sdk/react";
import { fullLessonSchema } from "@/lib/ai/schemas";
import { AddEntryModal } from "@/components/journal/add-entry-modal";
import { ObjectiveList } from "@/components/lesson/objective-list";
import { QuizSection } from "@/components/lesson/quiz-section";
import { LessonChat } from "@/components/lesson/lesson-chat";
import { StickyLessonHud } from "@/components/lesson/sticky-lesson-hud";
import { IdleBanner } from "@/components/lesson/idle-banner";
import {
  LessonCompletionModal,
  type CompletionFeedbackData,
} from "@/components/lesson/lesson-completion-modal";
import { useLessonTimer, formatLessonTime } from "@/hooks/use-lesson-timer";
import { cn } from "@/lib/utils";
import { YouTubeEmbedCard } from "@/components/lesson/youtube-embed-card";
import { useSetBreadcrumbTitle } from "@/contexts/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import type { FullLessonContent, ActivityType, TeachingStep, Activity, QuizQuestion, VideoResource } from "@/lib/lessonGenerator";

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
  activeSeconds?: number;
  isPaused?: boolean;
  startedAt: string | null;
  completedAt: string | null;
  child: {
    id: string;
    name: string;
    age: number | null;
    yearGroup: string | null;
    learningStyle: string | null;
    bloomStars?: number;
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

function Section({
  icon,
  title,
  children,
  accent,
  isStreaming,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  isStreaming?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-5 transition-all duration-300",
        accent
          ? "bg-brand-mint/40 border-brand-green/25"
          : "bg-white border-[hsl(var(--border))]",
        isStreaming && "ring-1 ring-brand-green/30"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-brand-green-deep flex items-center gap-2">
          <span className="text-brand-green">{icon}</span>
          {title}
        </h2>
        {isStreaming && (
          <span className="text-[10px] text-brand-green bg-brand-mint px-2 py-0.5 rounded-full font-medium animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        )}
      </div>
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
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [refineNotice, setRefineNotice] = useState<{
    intent: "easier" | "harder" | "alternative";
  } | null>(null);

  useSetBreadcrumbTitle(content?.title ?? lesson?.topic ?? "Lesson");

  // ── Stream Hook for Initial Generation ──────────────────────────────────────
  const {
    object: streamedDetail,
    isLoading: isDetailStreaming,
    error: detailStreamError,
    submit: submitDetailStream,
  } = useObject({
    api: `/api/lessons/${lessonId}/generate-detail`,
    schema: fullLessonSchema,
    onFinish: ({ object }) => {
      if (object) {
        setContent(object as FullLessonContent);
        if (object.objectives) {
          setObjectives(
            object.objectives.map((text, i) => ({
              id: `obj-${i}`,
              text: text ?? "",
              completed: false,
              completedAt: null,
            }))
          );
        }
        setPhase("ready");
      }
    },
  });

  // ── Stream Hook for Refinement ──────────────────────────────────────────────
  const [refiningIntent, setRefiningIntent] = useState<"easier" | "harder" | "alternative" | null>(null);
  const {
    object: streamedRefine,
    isLoading: isRefineStreaming,
    error: refineStreamError,
    submit: submitRefineStream,
  } = useObject({
    api: `/api/lessons/${lessonId}/refine`,
    schema: fullLessonSchema,
    onError: () => {
      setRefiningIntent(null);
    },
    onFinish: ({ object }) => {
      if (object) {
        setContent(object as FullLessonContent);
        if (object.objectives) {
          setObjectives(
            object.objectives.map((text, i) => ({
              id: `obj-${i}`,
              text: text ?? "",
              completed: false,
              completedAt: null,
            }))
          );
        }
        if (refiningIntent) {
          setRefineNotice({ intent: refiningIntent });
        }
        setRefiningIntent(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
  });

  function handleRefine(intent: "easier" | "harder" | "alternative") {
    if (isCurrentlyStreaming || statusLoading) return;
    // Clear previous lesson content and objectives from local memory so skeletons render
    setContent(null);
    setObjectives([]);
    setRefiningIntent(intent);
    setRefineNotice(null);
    submitRefineStream({ intent });
  }

  const hasTriggeredGenRef = useRef(false);

  // ── Initial Data Fetch ──────────────────────────────────────────────────────
  const retry = useCallback(() => {
    hasTriggeredGenRef.current = false;
    setPhase("loading");
    setErrorMsg("");
    fetch(`/api/lessons/${lessonId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Lesson not found");
        return res.json();
      })
      .then(({ lesson: l, parsedContent }) => {
        setLesson(l);
        if (parsedContent?.teachingGuide?.length) {
          setContent(parsedContent as FullLessonContent);
          setObjectives(l.objectives ?? []);
          setPhase("ready");
        } else {
          hasTriggeredGenRef.current = true;
          setPhase("ready");
          submitDetailStream({});
        }
      })
      .catch((err) => {
        setPhase("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      });
  }, [lessonId, submitDetailStream]);

  useEffect(() => {
    let cancelled = false;
    hasTriggeredGenRef.current = false;
    setPhase("loading");
    setErrorMsg("");

    async function initLesson() {
      try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (!res.ok) throw new Error("Lesson not found");
        const { lesson: l, parsedContent } = await res.json();
        if (cancelled) return;
        setLesson(l);

        if (parsedContent?.teachingGuide?.length) {
          setContent(parsedContent as FullLessonContent);
          setObjectives(l.objectives ?? []);
          setPhase("ready");
        } else {
          if (!hasTriggeredGenRef.current) {
            hasTriggeredGenRef.current = true;
            setPhase("ready");
            submitDetailStream({});
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    initLesson();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // ── Timer / Start / Complete Controls ──────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState<CompletionFeedbackData | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showStickyHud, setShowStickyHud] = useState(false);
  const timerCardRef = useRef<HTMLDivElement>(null);

  const {
    activeSeconds,
    isPaused,
    isIdle,
    pause,
    resume,
    dismissIdle,
    formatElapsed,
  } = useLessonTimer({
    lessonId,
    initialSeconds: lesson?.activeSeconds ?? 0,
    status: lesson?.status ?? "PENDING",
    initialPaused: lesson?.isPaused ?? false,
  });

  useEffect(() => {
    const el = timerCardRef.current;
    if (!el || lesson?.status !== "IN_PROGRESS") {
      setShowStickyHud(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHud(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [lesson?.status]);

  async function handleStart() {
    if (!lesson) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/start`, { method: "POST" });
      if (res.ok) {
        setLesson((prev) =>
          prev
            ? {
                ...prev,
                status: "IN_PROGRESS",
                isPaused: false,
                startedAt: prev.startedAt ?? new Date().toISOString(),
              }
            : prev
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
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSeconds }),
      });
      if (res.ok) {
        const data = await res.json();
        setLesson((prev) =>
          prev
            ? {
                ...prev,
                status: "COMPLETED",
                completedAt: new Date().toISOString(),
                activeSeconds,
                durationMins: data.lesson?.durationMins ?? Math.max(1, Math.round(activeSeconds / 60)),
                child: prev.child
                  ? {
                      ...prev.child,
                      bloomStars: data.bloom?.totalStars ?? data.bloomStars ?? prev.child.bloomStars,
                    }
                  : prev.child,
              }
            : prev
        );
        setCompletionFeedback(data);
        setShowCompletionModal(true);
        setShowJournalPrompt(true);
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

  if (phase === "loading" && !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-muted-foreground text-sm">Loading lesson…</span>
      </div>
    );
  }

  if (phase === "error" || detailStreamError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-green-deep mb-1">
            Couldn&apos;t load lesson
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {errorMsg || detailStreamError?.message || "An error occurred"}
          </p>
          <button
            onClick={retry}
            className="bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-green-deep transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  // Active displayed data: either from refined stream, detail stream, or cached content
  const activeStream = isRefineStreaming
    ? streamedRefine
    : isDetailStreaming
    ? streamedDetail
    : null;

  const displayTitle =
    activeStream?.title || (isRefineStreaming ? "" : content?.title) || (isRefineStreaming ? "" : lesson.topic);
  const displayDescription =
    activeStream?.description || (isRefineStreaming ? "" : content?.description);

  const rawObjectives =
    activeStream?.objectives || (isRefineStreaming ? [] : content?.objectives) || [];
  const displayObjectives: Objective[] =
    !isRefineStreaming && objectives.length > 0
      ? objectives
      : (rawObjectives.filter(Boolean) as string[]).map((text, i) => ({
          id: `stream-obj-${i}`,
          text,
          completed: false,
          completedAt: null,
        }));

  const displayTeachingGuide: TeachingStep[] =
    (activeStream?.teachingGuide?.filter(Boolean) as TeachingStep[]) ||
    (isRefineStreaming ? [] : content?.teachingGuide) ||
    [];

  const displayActivities: Activity[] =
    (activeStream?.activities?.filter(Boolean) as Activity[]) ||
    (isRefineStreaming ? [] : content?.activities) ||
    [];

  const displayVideos: VideoResource[] =
    (activeStream?.videoResources?.filter(Boolean) as VideoResource[]) ||
    (isRefineStreaming ? [] : content?.videoResources) ||
    [];

  const displayFaith =
    activeStream?.faithConnection || (isRefineStreaming ? null : content?.faithConnection);

  const displayDayOut =
    activeStream?.dayOut || (isRefineStreaming ? null : content?.dayOut);

  const displayQuiz: QuizQuestion[] =
    (activeStream?.quiz?.filter(Boolean) as QuizQuestion[]) ||
    (isRefineStreaming ? [] : content?.quiz) ||
    [];

  const { child } = lesson;
  const isCurrentlyStreaming = isDetailStreaming || isRefineStreaming;

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 print:max-w-full print:px-0 print:py-0 print:space-y-3">
      {/* Top bar: breadcrumbs + worksheet link */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Breadcrumbs className="py-0 flex-1 min-w-0" />
        <Link
          href={`/dashboard/lesson/${lessonId}/worksheet`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-deep bg-brand-mint hover:bg-brand-mint/80 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
          Worksheet
        </Link>
      </div>

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5 transition-all">
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
          {isCurrentlyStreaming && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-green bg-brand-mint px-2.5 py-1 rounded-full animate-pulse">
              <Sparkles className="w-3 h-3" />
              {isRefineStreaming ? "Refining lesson live..." : "Generating lesson live..."}
            </span>
          )}
        </div>

        {displayTitle ? (
          <h1 className="font-display text-xl font-bold text-brand-green-deep leading-snug mb-3">
            {displayTitle}
          </h1>
        ) : (
          <div className="h-7 bg-muted/60 rounded-md animate-pulse w-3/4 mb-3" />
        )}

        {displayDescription ? (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {displayDescription}
          </p>
        ) : (
          <div className="space-y-1.5 mb-4">
            <div className="h-4 bg-muted/60 rounded animate-pulse w-full" />
            <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
          </div>
        )}

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

      {/* Start / Complete / Timer */}
      <div
        ref={timerCardRef}
        className="bg-white rounded-2xl border border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between gap-3 print:hidden"
      >
        {lesson.status === "PENDING" && (
          <>
            <p className="text-sm text-muted-foreground">
              Ready when you are. Tap start to begin the timer.
            </p>
            <button
              onClick={handleStart}
              disabled={statusLoading || isCurrentlyStreaming}
              className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
            >
              {statusLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              Start lesson
            </button>
          </>
        )}
        {lesson.status === "IN_PROGRESS" && (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors select-none",
                  isPaused || isIdle
                    ? "bg-amber-100 text-amber-800"
                    : "bg-brand-mint text-brand-green"
                )}
              >
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                  {!isPaused && !isIdle && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      isPaused || isIdle ? "bg-amber-500" : "bg-brand-green"
                    )}
                  />
                </span>
                <span className="font-mono tabular-nums tracking-tight min-w-[3.25rem] text-center">
                  {formatElapsed()}
                </span>
                {isIdle ? (
                  <span className="text-[10px] uppercase font-bold text-amber-700 ml-1">Idle</span>
                ) : isPaused ? (
                  <span className="text-[10px] uppercase font-bold text-amber-700 ml-1">Paused</span>
                ) : null}
              </span>

              <button
                onClick={isPaused || isIdle ? resume : pause}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors",
                  isPaused || isIdle
                    ? "bg-brand-green text-white hover:bg-brand-green-deep border-brand-green"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-[hsl(var(--border))]"
                )}
                title={isPaused || isIdle ? "Resume lesson timer" : "Pause lesson timer"}
              >
                {isPaused || isIdle ? (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    Pause
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleComplete}
              disabled={statusLoading || isCurrentlyStreaming}
              className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
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
            {typeof lesson.activeSeconds === "number" && lesson.activeSeconds > 0 ? (
              <span className="text-muted-foreground">
                · {formatLessonTime(lesson.activeSeconds)} spent
              </span>
            ) : lesson.durationMins > 0 ? (
              <span className="text-muted-foreground">
                · {lesson.durationMins} min spent
              </span>
            ) : null}
          </div>
        )}
      </div>

      {isIdle && (
        <IdleBanner onResume={dismissIdle} onDismiss={dismissIdle} />
      )}

      {showJournalPrompt && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 print:hidden animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-900 font-medium">
              Add a reflection note to {child.name}&apos;s journal?
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowJournalModal(true)}
              className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
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
            topic: displayTitle,
          }}
          onClose={() => setShowJournalModal(false)}
          onSaved={() => {
            setShowJournalModal(false);
            setShowJournalPrompt(false);
          }}
        />
      )}

      {/* Refine bar */}
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
            const isThisOne = refiningIntent === id;
            const disabled = isCurrentlyStreaming || statusLoading;
            return (
              <button
                key={id}
                onClick={() => handleRefine(id)}
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
        {refineStreamError && (
          <p className="text-xs text-destructive">{refineStreamError.message}</p>
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
      <Section
        icon={<Target className="w-4 h-4" />}
        title="Learning Objectives"
        isStreaming={isCurrentlyStreaming && displayObjectives.length === 0}
      >
        {displayObjectives.length > 0 ? (
          <ObjectiveList lessonId={lessonId} objectives={displayObjectives} />
        ) : (
          <div className="space-y-2">
            <div className="h-4 bg-muted/60 rounded animate-pulse w-4/5" />
            <div className="h-4 bg-muted/40 rounded animate-pulse w-3/5" />
          </div>
        )}
      </Section>

      {/* Teaching guide */}
      <Section
        icon={<BookOpen className="w-4 h-4" />}
        title="Teaching Guide"
        isStreaming={isCurrentlyStreaming && displayTeachingGuide.length < 4}
      >
        {displayTeachingGuide.length > 0 ? (
          <div className="space-y-4">
            {displayTeachingGuide.map((step) => (
              <div key={step.step} className="flex gap-3.5 animate-in fade-in slide-in-from-left-2">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {step.step}
                  </div>
                  {step.step < 4 && (
                    <div className="w-px flex-1 bg-brand-green/20 mt-1.5" />
                  )}
                </div>
                <div className="pb-4 flex-1">
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
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex gap-3.5">
                <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-muted/70 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted/40 rounded animate-pulse w-full" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Activities */}
      <Section
        icon={<Play className="w-4 h-4" />}
        title="Activities"
        isStreaming={isCurrentlyStreaming && displayActivities.length === 0}
      >
        {displayActivities.length > 0 ? (
          <div className="space-y-3">
            {displayActivities.map((activity, i) => {
              const type = (activity.type || "Hands-on") as ActivityType;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-4 animate-in fade-in"
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
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 space-y-2">
              <div className="h-3 bg-muted/60 rounded animate-pulse w-20" />
              <div className="h-4 bg-muted/80 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted/40 rounded animate-pulse w-full" />
            </div>
          </div>
        )}
      </Section>

      {/* Video resources */}
      {displayVideos.length > 0 && (
        <Section icon={<Youtube className="w-4 h-4" />} title="Video Resources">
          <div className="space-y-4">
            {displayVideos.map((v, i) => (
              <YouTubeEmbedCard key={i} video={v} isStreaming={isCurrentlyStreaming} />
            ))}
          </div>
        </Section>
      )}

      {/* Faith connection */}
      {displayFaith && (
        <div className="rounded-2xl bg-brand-mint/50 border border-brand-green/25 px-5 py-5 animate-in fade-in">
          <h2 className="font-display font-semibold text-brand-green-deep flex items-center gap-2 mb-4">
            <span>🌙</span> Faith Connection
          </h2>

          {displayFaith.arabicText && (
            <p
              dir="rtl"
              className="text-right font-arabic text-xl text-brand-green-deep leading-loose mb-3 bg-white/60 rounded-xl px-4 py-3"
            >
              {displayFaith.arabicText}
            </p>
          )}

          <div className="space-y-2.5">
            <div className="flex gap-2.5 items-start">
              <span className="text-xs font-bold text-brand-green uppercase tracking-wide shrink-0 mt-0.5">
                Reference
              </span>
              <span className="text-sm text-brand-green-deep font-medium">
                {displayFaith.reference}
              </span>
            </div>

            {displayFaith.translation && (
              <div className="flex gap-2.5 items-start">
                <span className="text-xs font-bold text-brand-green uppercase tracking-wide shrink-0 mt-0.5">
                  Translation
                </span>
                <span className="text-sm text-brand-green-deep/80 italic leading-relaxed">
                  &ldquo;{displayFaith.translation}&rdquo;
                </span>
              </div>
            )}

            <div className="bg-white/60 rounded-xl px-4 py-3 mt-1">
              <p className="text-sm text-brand-green-deep leading-relaxed">
                {displayFaith.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Day out */}
      {displayDayOut && (
        <Section icon={<MapPin className="w-4 h-4" />} title="Day Out Idea">
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-brand-green-deep text-sm">
                  {displayDayOut.venueName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {displayDayOut.address}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {displayDayOut.description}
            </p>
          </div>
        </Section>
      )}

      {/* Quiz */}
      {displayQuiz.length > 0 && (
        <Section icon={<Lightbulb className="w-4 h-4" />} title="Quick Quiz">
          <QuizSection questions={displayQuiz} isStreaming={isCurrentlyStreaming} />
        </Section>
      )}

      {/* Bottom padding */}
      <div className="h-4" />

      {/* Floating Ask-AI button */}
      <LessonChat lessonId={lessonId} />

      {/* Sticky floating pill HUD in top right when scrolled past top timer */}
      <StickyLessonHud
        status={lesson.status}
        isPaused={isPaused}
        isIdle={isIdle}
        formattedTime={formatElapsed()}
        statusLoading={statusLoading}
        onPause={pause}
        onResume={resume}
        onComplete={handleComplete}
        isVisible={showStickyHud}
      />

      {/* Celebratory Lesson Completion Modal */}
      <LessonCompletionModal
        isOpen={showCompletionModal}
        childName={child.name}
        lessonTitle={displayTitle}
        subject={lesson.subject}
        feedback={completionFeedback}
        onClose={() => setShowCompletionModal(false)}
        onOpenJournal={() => {
          setShowCompletionModal(false);
          setShowJournalModal(true);
        }}
      />
    </div>
  );
}
