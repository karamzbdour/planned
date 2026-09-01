"use client";

import { useEffect, useState, useCallback } from "react";
import { useActiveChild } from "@/contexts/active-child";
import { LessonCard } from "@/components/dashboard/lesson-card";
import { LessonListSkeleton } from "@/components/dashboard/lesson-card-skeleton";
import { BloomBar } from "@/components/dashboard/bloom-bar";
import { StatsRow } from "@/components/dashboard/stats-row";
import { GenerateLessons } from "@/components/dashboard/generate-lessons";
import { ActiveLessonBanner } from "@/components/dashboard/active-lesson-banner";
import { AddEntryModal } from "@/components/journal/add-entry-modal";
import { BookOpen, Loader2, Plus, CalendarDays, AlertTriangle, Clock, Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardRange = "today" | "yesterday" | "this-week" | "last-week" | "custom";

interface MissedLesson {
  id: string;
  subject: string;
  topic: string;
  dayDate: string;
  status: string;
  durationMins?: number;
  activeSeconds?: number;
  isPaused?: boolean;
  objectivesDone: number;
  objectivesTotal: number;
  parsedContent: { title?: string; description?: string };
}

interface DashboardLesson {
  id: string;
  subject: string;
  topic: string;
  status: string;
  durationMins: number;
  activeSeconds?: number;
  isPaused?: boolean;
  startedAt: string | null;
  completedAt: string | null;
  dayDate: string;
  objectivesDone?: number;
  objectivesTotal?: number;
  parsedContent: { title?: string; description?: string; objectives?: string[] };
}

interface DashboardData {
  child: {
    id: string;
    name: string;
    age: number | null;
    yearGroup: string | null;
    bloomStars: number;
  };
  familyProfile: {
    curriculum: string;
    faith: string;
    faithIntegration: boolean;
    location: string | null;
  } | null;
  range: DashboardRange;
  rangeLabel: string;
  todaysLessons: DashboardLesson[];
  activeLesson: DashboardLesson | null;
  missedLessons: MissedLesson[];
  stats: {
    lessonsDoneToday: number;
    totalLessonsToday: number;
    curriculumPercent: number;
    bloomStars: number;
  };
  nextReward: { id: string; name: string; starsRequired: number } | null;
  hasAnyLessons: boolean;
  subjectProgress: Record<string, { done: number; total: number }>;
}

const RANGE_OPTIONS: { id: DashboardRange; label: string }[] = [
  { id: "today",      label: "Today" },
  { id: "yesterday",  label: "Yesterday" },
  { id: "this-week",  label: "This week" },
  { id: "last-week",  label: "Last week" },
];

const CURRICULUM_LABELS: Record<string, string> = {
  BNC: "British National Curriculum",
  MONTESSORI: "Montessori",
  UNSCHOOLING: "Child-led",
};

const FAITH_LABELS: Record<string, string> = {
  ISLAM: "Islam",
  CHRISTIANITY: "Christianity",
  JUDAISM: "Judaism",
  SECULAR: "",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

export default function DashboardPage() {
  const { activeChild, allChildren } = useActiveChild();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DashboardRange>("today");
  // For range === "custom" only. Held as a YYYY-MM-DD string so the date
  // input can bind directly to it without timezone gymnastics.
  const [customDate, setCustomDate] = useState<string>("");
  // Manual "Generate week" button state — client reported that when one
  // child has lessons and another doesn't, there was no way to trigger
  // generation for the empty child. This button is always available.
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [showLogActivity, setShowLogActivity] = useState(false);

  const fetchData = useCallback(
    async (childId: string, rangeParam: DashboardRange, dateParam: string) => {
      setLoading(true);
      try {
        const url = new URL("/api/dashboard", window.location.origin);
        url.searchParams.set("childId", childId);
        url.searchParams.set("range", rangeParam);
        if (rangeParam === "custom" && dateParam) {
          url.searchParams.set("date", dateParam);
        }
        const res = await fetch(url.toString());
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!activeChild?.id) return;
    // Skip the fetch when the user has picked "custom" but not chosen a
    // date yet — otherwise we'd thrash the API with the default empty
    // value and the UI would flicker.
    if (range === "custom" && !customDate) return;
    fetchData(activeChild.id, range, customDate);
  }, [activeChild?.id, range, customDate, fetchData]);

  function handleGenerate() {
    if (!activeChild?.id || generating) return;
    setGenerating(true);
    setGenerateError("");
  }

  // No children at all
  if (allChildren.length === 0) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl planned-gradient flex items-center justify-center mb-6 shadow-md">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-brand-green-deep mb-3">
          Welcome to Planned!
        </h1>
        <p className="text-muted-foreground mb-8">
          Let&apos;s add your first child to start generating personalised
          lessons.
        </p>
        <Link href="/onboarding/child">
          <Button className="bg-brand-green hover:bg-brand-green-deep gap-2">
            <Plus className="w-4 h-4" />
            Add your first child
          </Button>
        </Link>
      </div>
    );
  }

  // Waiting for child to be resolved from localStorage
  if (!activeChild) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
      </div>
    );
  }

  // Loading dashboard data — show skeleton
  if (loading || !data) {
    return (
      <div className="px-3 sm:px-5 py-4 sm:py-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Top bar skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="animate-pulse h-5 w-40 bg-muted rounded-md" />
            <div className="animate-pulse h-3.5 w-56 bg-muted rounded-md" />
          </div>
          <div className="animate-pulse h-7 w-20 bg-muted rounded-xl shrink-0" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-2xl" />
          ))}
        </div>
        {/* Cards skeleton */}
        <LessonListSkeleton count={4} />
      </div>
    );
  }

  // No lessons yet or active generation triggered — stream generation canvas
  if (!data.hasAnyLessons || generating) {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto space-y-4">
        {generating && data.hasAnyLessons && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGenerating(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel & back to dashboard
            </Button>
          </div>
        )}
        <GenerateLessons
          childId={activeChild.id}
          childName={activeChild.name}
          faith={data.familyProfile?.faith}
          faithIntegration={data.familyProfile?.faithIntegration}
          location={data.familyProfile?.location ?? undefined}
          onGenerated={() => {
            setGenerating(false);
            fetchData(activeChild.id, range, customDate);
          }}
        />
      </div>
    );
  }

  const child = data.child;
  const fp = data.familyProfile;
  const curriculum = CURRICULUM_LABELS[fp?.curriculum ?? "BNC"] ?? fp?.curriculum ?? "BNC";
  const faithLabel =
    fp?.faithIntegration && fp?.faith !== "SECULAR"
      ? (FAITH_LABELS[fp.faith] ?? "")
      : "";

  const metaParts = [
    child.yearGroup,
    curriculum,
    faithLabel,
  ].filter(Boolean);

  return (
    <>
      {showLogActivity && activeChild && (
        <AddEntryModal
          childId={activeChild.id}
          childName={activeChild.name}
          onClose={() => setShowLogActivity(false)}
          onSaved={() => fetchData(activeChild.id, range, customDate)}
        />
      )}

      <div className="px-3.5 sm:px-5 py-4 sm:py-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-brand-green-deep leading-tight">
              {greeting()}, {child.name}&apos;s parent
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {data.stats.totalLessonsToday} lesson
              {data.stats.totalLessonsToday !== 1 ? "s" : ""} {data.rangeLabel.toLowerCase()}
              {metaParts.length > 0 && (
                <> · {metaParts.join(" · ")}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowLogActivity(true)}
              className="inline-flex items-center gap-1.5 bg-brand-mint text-brand-green-deep border border-brand-green/30 hover:bg-brand-mint/80 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
              title="Log real-world learning, trips, or hands-on activities"
            >
              <Compass className="w-3.5 h-3.5 text-brand-green shrink-0" />
              <span>Log Activity</span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
              title="Generate this week's lessons for the active child"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{generating ? "Generating…" : "Generate"}</span>
            </button>
            <div className="hidden xs:flex items-center gap-1.5 bg-white border border-[hsl(var(--border))] rounded-xl px-2.5 sm:px-3 py-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-brand-green" />
              <span className="text-xs font-medium text-brand-green-deep">
                {todayLabel()}
              </span>
            </div>
          </div>
        </div>
      {generateError && (
        <p className="text-xs text-destructive -mt-2">{generateError}</p>
      )}

      {/* Date range toggle — Today / Yesterday / This week / Last week + custom date */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="bg-white rounded-xl border border-[hsl(var(--border))] p-1 flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
          {RANGE_OPTIONS.map((opt) => {
            const active = range === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className={cn(
                  "flex-1 min-w-fit px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap text-center",
                  active
                    ? "bg-brand-green text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {/* Custom date picker */}
        <label
          className={cn(
            "shrink-0 inline-flex items-center justify-between sm:justify-start gap-1.5 bg-white border rounded-xl px-3 py-1.5 cursor-pointer transition-colors text-xs",
            range === "custom"
              ? "border-brand-green text-brand-green-deep ring-1 ring-brand-green/20"
              : "border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/40"
          )}
          title="Pick a specific date"
        >
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-brand-green" />
            <span className="sm:hidden font-medium text-muted-foreground">Pick date:</span>
          </div>
          <input
            type="date"
            value={customDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setRange("custom");
            }}
            className="text-xs font-medium bg-transparent outline-none cursor-pointer w-[115px]"
          />
        </label>
      </div>

      {/* Stats */}
      <StatsRow
        lessonsDoneToday={data.stats.lessonsDoneToday}
        totalLessonsToday={data.stats.totalLessonsToday}
        curriculumPercent={data.stats.curriculumPercent}
        bloomStars={data.stats.bloomStars}
      />

      {/* Active in-progress lesson banner */}
      {data.activeLesson && (
        <ActiveLessonBanner lesson={data.activeLesson} />
      )}

      {/* Lessons in the selected range. Week-level ranges (this-week,
          last-week) are broken into per-day groups; single-day ranges
          render as a flat list. */}
      <div>
        <h2 className="font-display font-semibold text-brand-green-deep mb-3">
          {data.range === "today"
            ? "Today's lessons"
            : data.range === "yesterday"
            ? "Yesterday's lessons"
            : data.range === "this-week"
            ? "This week's lessons"
            : data.range === "last-week"
            ? "Last week's lessons"
            : `Lessons for ${data.rangeLabel}`}
        </h2>

        {isWeekend() && data.todaysLessons.length === 0 && data.range === "today" ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-2xl mb-2">🌿</p>
            <p className="font-semibold text-brand-green-deep">
              Enjoy your weekend!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Lessons resume on Monday.
            </p>
          </div>
        ) : data.todaysLessons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-semibold text-brand-green-deep">
              No lessons in this range
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap Generate to plan a week, or pick a different range.
            </p>
          </div>
        ) : data.range === "this-week" || data.range === "last-week" ? (
          <LessonsByDay lessons={data.todaysLessons} subjectProgress={data.subjectProgress} />
        ) : (
          <div className="space-y-3">
            {data.todaysLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                subjectProgress={data.subjectProgress[lesson.subject]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Missed lessons — past 14 days of lessons the parent hasn't marked
          complete. Hidden when there's nothing to catch up on. */}
      {data.missedLessons && data.missedLessons.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-brand-green-deep mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Missed lessons
            <span className="text-xs font-normal text-muted-foreground">
              ({data.missedLessons.length})
            </span>
          </h2>
          <div className="space-y-2">
            {data.missedLessons.map((lesson) => {
              const isPartial =
                lesson.objectivesTotal > 0 &&
                lesson.objectivesDone > 0 &&
                lesson.objectivesDone < lesson.objectivesTotal;
              const dateLabel = new Date(lesson.dayDate).toLocaleDateString(
                "en-GB",
                { weekday: "short", day: "numeric", month: "short" },
              );
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/lesson/${lesson.id}`}
                  className="block bg-white rounded-xl border border-amber-200 hover:border-amber-300 transition-colors px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                        <Clock className="w-3 h-3" />
                        {dateLabel} · {lesson.subject}
                      </p>
                      <p className="font-medium text-sm text-brand-green-deep truncate">
                        {lesson.parsedContent.title ?? lesson.topic}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                        isPartial
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isPartial
                        ? `${lesson.objectivesDone}/${lesson.objectivesTotal} done`
                        : "Not started"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bloom reward bar */}
      <BloomBar
        childName={child.name}
        bloomStars={data.stats.bloomStars}
        nextReward={data.nextReward}
      />
    </div>
  </>
  );
}

// ─── Day-grouped lesson list (week views) ────────────────────────────────────

interface LessonsByDayProps {
  lessons: DashboardData["todaysLessons"];
  subjectProgress: DashboardData["subjectProgress"];
}

/**
 * For week-level ranges the lesson list is broken into per-day groups so
 * the parent can see which lessons belong to which day at a glance. Days
 * with no lessons are skipped (we don't render empty buckets).
 */
function LessonsByDay({ lessons, subjectProgress }: LessonsByDayProps) {
  // Group by YYYY-MM-DD key derived from dayDate, preserving the order the
  // API returned them in (which is ascending dayDate).
  const groups: { key: string; label: string; lessons: typeof lessons }[] = [];
  for (const lesson of lessons) {
    const d = new Date(lesson.dayDate);
    const key = d.toISOString().slice(0, 10);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        label: d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        }),
        lessons: [],
      };
      groups.push(group);
    }
    group.lessons.push(lesson);
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-green mb-2">
            {g.label}
            <span className="ml-1.5 text-muted-foreground font-medium normal-case tracking-normal">
              · {g.lessons.length} lesson{g.lessons.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <div className="space-y-3">
            {g.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                subjectProgress={subjectProgress[lesson.subject]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
