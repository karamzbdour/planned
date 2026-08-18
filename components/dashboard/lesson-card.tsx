"use client";

import { CheckCircle, Clock, ChevronRight, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatLessonTime } from "@/hooks/use-lesson-timer";

// Subject → colour mapping
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

interface LessonCardProps {
  lesson: {
    id: string;
    subject: string;
    topic: string;
    status: string;
    durationMins: number;
    activeSeconds?: number;
    isPaused?: boolean;
    startedAt: string | null;
    completedAt: string | null;
    parsedContent: {
      title?: string;
      description?: string;
      objectives?: string[];
    };
  };
  subjectProgress?: { done: number; total: number };
}

/**
 * Compact preview card shown on the dashboard. Only action is "View lesson"
 * — the actual Start / Mark complete flow with the timer lives on the
 * lesson detail page (client feedback: the preview was getting crowded and
 * the start button was confusing alongside the view button).
 */
export function LessonCard({ lesson, subjectProgress }: LessonCardProps) {
  const { status } = lesson;
  const title = lesson.parsedContent?.title || lesson.topic;
  const description = lesson.parsedContent?.description;
  const progressPct =
    subjectProgress && subjectProgress.total > 0
      ? Math.round((subjectProgress.done / subjectProgress.total) * 100)
      : 0;

  return (
    <Link
      href={`/dashboard/lesson/${lesson.id}`}
      className={cn(
        "block bg-white rounded-2xl border transition-all duration-200 group",
        status === "COMPLETED"
          ? "border-brand-green/30 bg-brand-mint/20"
          : status === "IN_PROGRESS"
          ? "border-brand-green shadow-sm shadow-brand-green/10"
          : "border-[hsl(var(--border))] hover:border-brand-green/30 hover:shadow-sm",
      )}
    >
      {/* Header — subject + status pill */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              subjectColor(lesson.subject),
            )}
          />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {lesson.subject}
          </span>
          <span className="text-xs text-muted-foreground/70 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lesson.durationMins} min
          </span>
        </div>

        {status === "PENDING" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            Not started
          </span>
        )}
        {status === "IN_PROGRESS" && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
              lesson.isPaused
                ? "bg-amber-100 text-amber-800"
                : "bg-brand-mint text-brand-green"
            )}
          >
            {lesson.isPaused ? (
              <>
                <Pause className="w-3 h-3 fill-current text-amber-600" />
                {typeof lesson.activeSeconds === "number" && lesson.activeSeconds > 0
                  ? `Paused · ${formatLessonTime(lesson.activeSeconds)}`
                  : "Paused"}
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                {typeof lesson.activeSeconds === "number" && lesson.activeSeconds > 0
                  ? `In progress · ${formatLessonTime(lesson.activeSeconds)}`
                  : "In progress"}
              </>
            )}
          </span>
        )}
        {status === "COMPLETED" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green-deep bg-brand-mint px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Done
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h3 className="font-display font-semibold text-brand-green-deep leading-snug mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {/* Subject progress bar */}
        {subjectProgress && subjectProgress.total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{lesson.subject} progress</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Footer — single CTA, the whole card is also clickable */}
      <div className="px-4 pb-4 flex items-center justify-end gap-1.5 text-xs font-semibold text-brand-green group-hover:text-brand-green-deep transition-colors">
        View lesson
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
