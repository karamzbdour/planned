"use client";

import { CheckCircle, Clock, ChevronRight, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatLessonTime } from "@/hooks/use-lesson-timer";
import { getSubjectTheme } from "@/lib/subject-colors";

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
  const theme = getSubjectTheme(lesson.subject);
  const progressPct =
    subjectProgress && subjectProgress.total > 0
      ? Math.round((subjectProgress.done / subjectProgress.total) * 100)
      : 0;

  return (
    <Link
      href={`/dashboard/lesson/${lesson.id}`}
      className={cn(
        "block bg-white rounded-2xl border transition-[border-color,box-shadow,background-color] duration-150 group overflow-hidden relative shadow-2xs",
        status === "COMPLETED"
          ? "border-brand-green/30 bg-brand-mint/15"
          : status === "IN_PROGRESS"
          ? "border-brand-green ring-2 ring-brand-green/15 shadow-sm"
          : "border-border/80 hover:border-brand-green/40 hover:shadow-md",
      )}
    >
      {/* Top subtle subject accent line */}
      <div className={cn("h-1 w-full", theme.solidBg)} />

      {/* Header — subject + status pill */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold tracking-wide",
              theme.badgeBg,
              theme.badgeBorder,
              theme.text
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", theme.dot)} />
            {lesson.subject}
          </span>
          <span className="text-xs text-muted-foreground/80 inline-flex items-center gap-1 font-sans">
            <Clock className="w-3 h-3 text-muted-foreground/60" />
            {lesson.durationMins} min
          </span>
        </div>

        {status === "PENDING" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            Not started
          </span>
        )}
        {status === "IN_PROGRESS" && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full",
              lesson.isPaused
                ? "bg-amber-50 text-amber-900 border border-amber-200"
                : "bg-brand-mint text-brand-green border border-brand-green/20"
            )}
          >
            {lesson.isPaused ? (
              <>
                <Pause className="w-3 h-3 fill-current text-amber-700" />
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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green-deep bg-brand-mint border border-brand-green/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
            Done
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h3 className="font-display font-bold text-base text-brand-green-deep leading-snug mb-1.5 group-hover:text-brand-green transition-colors">
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
              <span className="font-medium">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Footer — single CTA, the whole card is also clickable */}
      <div className="px-4 pb-3.5 flex items-center justify-end gap-1.5 text-xs font-semibold text-brand-green group-hover:text-brand-green-deep transition-colors">
        View lesson
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
