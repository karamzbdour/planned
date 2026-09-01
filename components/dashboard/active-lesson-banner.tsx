"use client";

import Link from "next/link";
import { Play, Pause, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLessonTime } from "@/hooks/use-lesson-timer";

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "bg-blue-500",
  maths: "bg-blue-500",
  english: "bg-violet-500",
  literacy: "bg-violet-500",
  science: "bg-emerald-500",
  history: "bg-amber-500",
  geography: "bg-teal-500",
  art: "bg-pink-500",
  music: "bg-purple-500",
  "religious studies": "bg-indigo-500",
  re: "bg-indigo-500",
  pe: "bg-orange-500",
  "physical education": "bg-orange-500",
  computing: "bg-cyan-500",
};

function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "bg-brand-green";
}

interface ActiveLessonBannerProps {
  lesson: {
    id: string;
    subject: string;
    topic: string;
    status: string;
    durationMins: number;
    activeSeconds?: number;
    isPaused?: boolean;
    startedAt: string | null;
    parsedContent?: {
      title?: string;
      description?: string;
    };
    objectivesDone?: number;
    objectivesTotal?: number;
  };
}

export function ActiveLessonBanner({ lesson }: ActiveLessonBannerProps) {
  const title = lesson.parsedContent?.title || lesson.topic;
  const activeSecs = lesson.activeSeconds ?? 0;
  const formattedTime = formatLessonTime(activeSecs);
  const isPaused = lesson.isPaused ?? false;
  const hasObjectives = typeof lesson.objectivesTotal === "number" && lesson.objectivesTotal > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-brand-green/40 bg-gradient-to-br from-brand-mint/40 via-white to-brand-mint/20 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left side: In-progress indicator, title, subject */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                isPaused
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-brand-mint text-brand-green border border-brand-green/30"
              )}
            >
              {isPaused ? (
                <>
                  <Pause className="w-3 h-3 fill-current text-amber-600" />
                  Paused · {formattedTime} spent
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  In progress · {formattedTime} elapsed
                </>
              )}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/80 border border-[hsl(var(--border))] px-2.5 py-0.5 rounded-full">
              <span className={cn("w-2 h-2 rounded-full shrink-0", subjectColor(lesson.subject))} />
              {lesson.subject}
            </span>

            {hasObjectives && (
              <span className="inline-flex items-center gap-1 text-xs text-brand-green-deep bg-white/80 border border-brand-green/20 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-brand-green" />
                {lesson.objectivesDone}/{lesson.objectivesTotal} objectives
              </span>
            )}
          </div>

          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-brand-green-deep leading-snug">
              {title}
            </h3>
            {lesson.parsedContent?.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {lesson.parsedContent.description}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Resume CTA */}
        <div className="shrink-0">
          <Link
            href={`/dashboard/lesson/${lesson.id}`}
            className="inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow group w-full sm:w-auto"
          >
            <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
            Resume lesson
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
