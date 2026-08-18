"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { CircularProgress } from "@/components/progress/circular-progress";
import { MasteryModal } from "@/components/progress/mastery-modal";
import { MasteryTier } from "@/lib/mastery";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  BookCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Sliders,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonItem {
  id: string;
  topic: string;
  completedAt?: string | null;
  durationMins?: number;
  objectivesDone?: number;
  objectivesTotal?: number;
}

interface ObjectiveItem {
  id: string;
  lessonId: string;
  lessonTopic: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

interface ExternalActivity {
  id: string;
  description: string;
  durationMins: number;
  activityDate: string;
}

interface SubjectData {
  subject: string;
  child: { id: string; name: string; yearGroup: string | null };
  progress: {
    topicsCompleted: number;
    topicsTotal: number;
    topicsInProgress: number;
    objectivesMet: number;
    totalMinutes: number;
  };
  abilityLevel: string;
  isManualOverride?: boolean;
  lastLevelUpAt?: string | null;
  nextTierRequirements?: {
    nextTier: MasteryTier;
    targetRatio: number;
    targetTopics: number;
    neededObjectives: number;
    neededTopics: number;
  };
  lessons: {
    completed: LessonItem[];
    inProgress: LessonItem[];
    upcoming: LessonItem[];
  };
  objectives: ObjectiveItem[];
  externalActivities: ExternalActivity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#3b82f6",
  maths: "#3b82f6",
  english: "#8b5cf6",
  science: "#10b981",
  history: "#f59e0b",
  geography: "#14b8a6",
  art: "#ec4899",
  music: "#a855f7",
  "religious studies": "#6366f1",
  pe: "#f97316",
  computing: "#06b6d4",
};

const ABILITY_STYLES: Record<string, string> = {
  EMERGING: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  DEVELOPING: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  SECURE: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  EXCEEDING: "bg-purple-100 text-purple-700 hover:bg-purple-200",
};

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "#1D9E75";
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMinutes(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

// ─── Note section ─────────────────────────────────────────────────────────────

interface GuidanceData {
  note: string;
  strength?: string;
  growth?: string;
  nextStep?: string;
}

function ParentNote({
  subject,
  childId,
  childName,
}: {
  subject: string;
  childId: string;
  childName?: string;
}) {
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/progress/${encodeURIComponent(subject)}/note`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGuidance(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [subject, childId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-green/20 p-4 shadow-sm space-y-3 animate-pulse">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-green animate-spin" />
            <div className="h-3.5 w-24 bg-brand-mint rounded" />
          </div>
          <div className="h-3.5 w-12 bg-muted rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/70 space-y-1">
            <div className="h-2.5 w-20 bg-emerald-200/70 rounded" />
            <div className="h-3 w-full bg-emerald-100/70 rounded" />
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100/70 space-y-1">
            <div className="h-2.5 w-24 bg-amber-200/70 rounded" />
            <div className="h-3 w-5/6 bg-amber-100/70 rounded" />
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100/70 space-y-1">
            <div className="h-2.5 w-20 bg-sky-200/70 rounded" />
            <div className="h-3 w-4/5 bg-sky-100/70 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (guidance) {
    const hasStructured = Boolean(
      guidance.strength || guidance.growth || guidance.nextStep
    );

    return (
      <div className="bg-white rounded-2xl border border-brand-green/20 p-4 shadow-sm space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-mint flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-brand-green" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-green-deep">
                Guidance Hint
              </h3>
              <p className="text-[10px] text-muted-foreground">
                AI parent assessment
              </p>
            </div>
          </div>
          <button
            onClick={generate}
            title="Refresh guidance"
            className="flex items-center gap-1 text-[11px] text-brand-green hover:text-brand-green-deep font-medium px-2 py-1 rounded-md hover:bg-brand-mint/60 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Update</span>
          </button>
        </div>

        {/* Structured Sections */}
        {hasStructured ? (
          <div className="space-y-2">
            {guidance.strength && (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Strength
                  </span>
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed pl-5">
                  {guidance.strength}
                </p>
              </div>
            )}

            {guidance.growth && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100/80">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Growth Focus
                  </span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed pl-5">
                  {guidance.growth}
                </p>
              </div>
            )}

            {guidance.nextStep && (
              <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100/80">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                    Next Step
                  </span>
                </div>
                <p className="text-xs text-sky-950 leading-relaxed pl-5">
                  {guidance.nextStep}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-brand-mint/30 rounded-xl border border-brand-green/20 p-3">
            <p className="text-xs text-brand-green-deep leading-relaxed">
              {guidance.note}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-mint flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-brand-green" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-brand-green-deep">
            Parent Guidance Hint
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Strengths, growth areas & next steps.
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Couldn't generate hint.</span>
          <button
            onClick={generate}
            className="underline text-brand-green font-medium ml-auto"
          >
            Retry
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-[0.99]"
        >
          <Sparkles className="w-3 h-3" />
          Get Guidance Hint
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubjectProgressPage() {
  const params = useParams();
  const subject = decodeURIComponent(params.subject as string);
  const { activeChild } = useActiveChild();
  const [data, setData] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showAllObjectives, setShowAllObjectives] = useState(false);
  const [showMasteryModal, setShowMasteryModal] = useState(false);

  const fetchSubjectData = useCallback(() => {
    if (!activeChild?.id) return;
    setLoading(true);
    setAnimate(false);
    fetch(`/api/progress/${encodeURIComponent(subject)}?childId=${activeChild.id}`)
      .then((r) => r.json())
      .then((json: SubjectData) => {
        setData(json);
        requestAnimationFrame(() => setTimeout(() => setAnimate(true), 50));
      })
      .finally(() => setLoading(false));
  }, [activeChild?.id, subject]);

  useEffect(() => {
    fetchSubjectData();
  }, [fetchSubjectData]);

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const { progress, abilityLevel, lessons, objectives, externalActivities } = data;
  const pct =
    progress.topicsTotal > 0
      ? Math.round((progress.topicsCompleted / progress.topicsTotal) * 100)
      : 0;
  const abilityStyle =
    ABILITY_STYLES[abilityLevel] ?? "bg-muted text-muted-foreground hover:bg-muted/80";
  const color = subjectColor(subject);

  const visibleObjectives = showAllObjectives ? objectives : objectives.slice(0, 8);
  const metCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/progress"
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <h1 className="font-display text-xl font-bold text-brand-green-deep">
          {subject}
        </h1>
        <button
          onClick={() => setShowMasteryModal(true)}
          title="View & calibrate mastery progression"
          className={cn(
            "group inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer",
            abilityStyle
          )}
        >
          <span>{abilityLevel.charAt(0) + abilityLevel.slice(1).toLowerCase()}</span>
          {data.isManualOverride ? (
            <Sliders className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Sparkles className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity text-brand-green" />
          )}
        </button>
      </div>

      {/* 2-Column Responsive Layout with Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Progress Overview, Topics, Objectives, Activities */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 min-w-0">
          {/* Overview card */}
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5">
            <div className="flex items-center gap-5">
              <CircularProgress percent={animate ? pct : 0} size={100} strokeWidth={9} color={color}>
                <span
                  className="font-display font-bold text-xl leading-none"
                  style={{ color }}
                >
                  {pct}%
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">done</span>
              </CircularProgress>

              <div className="flex-1 space-y-3">
                {[
                  {
                    icon: <BookCheck className="w-3.5 h-3.5" />,
                    value: `${progress.topicsCompleted}/${progress.topicsTotal}`,
                    label: "topics done",
                  },
                  {
                    icon: <Target className="w-3.5 h-3.5" />,
                    value: `${progress.objectivesMet}`,
                    label: "objectives met",
                  },
                  {
                    icon: <Clock className="w-3.5 h-3.5" />,
                    value: progress.totalMinutes > 0 ? formatMinutes(progress.totalMinutes) : "—",
                    label: "learning time",
                  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-brand-green">{s.icon}</span>
                    <span className="font-semibold text-sm text-brand-green-deep">
                      {s.value}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {progress.topicsInProgress > 0 && (
              <p className="mt-4 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                {progress.topicsInProgress} topic{progress.topicsInProgress > 1 ? "s" : ""} currently in progress
              </p>
            )}

            {/* Adaptive Mastery Milestone Tracker */}
            {data.nextTierRequirements && !data.isManualOverride && (
              <div className="mt-4 pt-3.5 border-t border-border/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-green-deep flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
                    Progression to {data.nextTierRequirements.nextTier.charAt(0) + data.nextTierRequirements.nextTier.slice(1).toLowerCase()}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {data.nextTierRequirements.neededObjectives > 0
                      ? `${data.nextTierRequirements.neededObjectives} obj${data.nextTierRequirements.neededObjectives > 1 ? "s" : ""} to unlock`
                      : "Requirements met"}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-green rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          Math.round(
                            ((data.objectives.filter((o) => o.completed).length) /
                              Math.max(
                                Math.ceil(data.objectives.length * data.nextTierRequirements.targetRatio),
                                1
                              )) *
                              100
                          ),
                          10
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Topics list */}
          {(lessons.completed.length > 0 ||
            lessons.inProgress.length > 0 ||
            lessons.upcoming.length > 0) && (
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-brand-green-deep">Topics</h2>
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                {lessons.completed.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/lesson/${l.id}`}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-green-deep truncate">
                        {l.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {l.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(l.completedAt)}
                          </span>
                        )}
                        {(l.objectivesTotal ?? 0) > 0 && (
                          <span className="text-xs text-brand-green font-medium">
                            ✓ {l.objectivesDone}/{l.objectivesTotal}
                          </span>
                        )}
                        {(l.durationMins ?? 0) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {l.durationMins}m
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
                  </Link>
                ))}

                {lessons.inProgress.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/lesson/${l.id}`}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-green-deep truncate">
                        {l.topic}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">In progress</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
                  </Link>
                ))}

                {lessons.upcoming.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/lesson/${l.id}`}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="flex-1 text-sm text-muted-foreground truncate">
                      {l.topic}
                    </p>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Objectives */}
          {objectives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-brand-green-deep">
                  Learning objectives
                </h2>
                <span className="text-xs text-muted-foreground">
                  {metCount}/{objectives.length} met
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                {visibleObjectives.map((obj) => (
                  <div key={obj.id} className="flex items-start gap-3 px-4 py-3">
                    {obj.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm",
                          obj.completed
                            ? "text-brand-green-deep"
                            : "text-muted-foreground"
                        )}
                      >
                        {obj.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {obj.lessonTopic}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {objectives.length > 8 && (
                <button
                  onClick={() => setShowAllObjectives((v) => !v)}
                  className="text-sm text-brand-green font-medium hover:underline"
                >
                  {showAllObjectives
                    ? "Show fewer"
                    : `Show all ${objectives.length} objectives`}
                </button>
              )}
            </div>
          )}

          {/* External activities */}
          {externalActivities.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-brand-green-deep">
                External activities
              </h2>
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                {externalActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-green-deep">
                        {a.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(a.activityDate)}
                        </span>
                        {a.durationMins > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {a.durationMins}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Parent Guidance Hint */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 self-start space-y-4">
          <ParentNote
            subject={subject}
            childId={activeChild.id}
            childName={data.child.name}
          />
        </div>
      </div>

      {/* Mastery Calibration & Progression Modal */}
      <MasteryModal
        open={showMasteryModal}
        onClose={() => setShowMasteryModal(false)}
        subject={subject}
        childId={activeChild.id}
        childName={data.child.name}
        currentLevel={data.abilityLevel}
        isManualOverride={data.isManualOverride ?? false}
        objectivesMet={metCount}
        totalObjectives={objectives.length}
        topicsCompleted={progress.topicsCompleted}
        nextTierRequirements={data.nextTierRequirements}
        onCalibrateSuccess={(_newLevel, _isManual) => {
          fetchSubjectData();
        }}
      />

      <div className="h-4" />
    </div>
  );
}
