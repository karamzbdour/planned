"use client";

import { useEffect, useRef } from "react";
import { useObject } from "@ai-sdk/react";
import { weekGenerationSchema } from "@/lib/ai/schemas";
import { Sparkles, CheckCircle, AlertCircle, Clock} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerateLessonsProps {
  childId: string;
  childName: string;
  faith?: string;
  faithIntegration?: boolean;
  location?: string;
  onGenerated: () => void;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

function subjectDotColor(subject?: string): string {
  if (!subject) return "bg-brand-green";
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "bg-brand-green";
}

export function GenerateLessons({
  childId,
  childName,
  onGenerated,
}: GenerateLessonsProps) {
  const hasTriggeredRef = useRef(false);
  const finishedRef = useRef(false);

  const { object, isLoading, error, submit } = useObject({
    api: "/api/lessons/generate-week",
    schema: weekGenerationSchema,
    onFinish: () => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setTimeout(onGenerated, 1200);
      }
    },
  });

  useEffect(() => {
    if (!hasTriggeredRef.current && childId) {
      hasTriggeredRef.current = true;
      submit({ childId });
    }
  }, [childId, submit]);

  const lessons = object?.lessons ?? [];
  const generatedCount = lessons.filter((l) => l?.title).length;

  // Find max day offset present
  const maxDayOffset = lessons.reduce(
    (max, l) => (l?.dayOffset !== undefined && l.dayOffset > max ? l.dayOffset : max),
    -1
  );

  function getStatusMessage() {
    if (!isLoading && generatedCount > 0) {
      return `${childName}'s week is ready!`;
    }
    if (generatedCount === 0) {
      return `Starting ${childName}'s personalised curriculum...`;
    }
    if (maxDayOffset === 0) {
      return `Monday's lessons drafted • Planning Tuesday...`;
    }
    if (maxDayOffset === 1) {
      return `Monday & Tuesday ready • Crafting Wednesday...`;
    }
    if (maxDayOffset === 2) {
      return `Mid-week ready • Designing Thursday & Friday...`;
    }
    if (maxDayOffset >= 3) {
      return `Almost complete • Finalising Friday's timetable...`;
    }
    return `Crafting ${childName}'s personalised week...`;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-display text-xl font-bold text-brand-green-deep mb-2">
          Couldn&apos;t generate lessons
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button
          onClick={() => {
            finishedRef.current = false;
            submit({ childId });
          }}
          className="bg-brand-green hover:bg-brand-green-deep gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Header Progress Banner */}
      <div className="bg-white rounded-2xl border border-brand-green/20 p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl planned-gradient flex items-center justify-center shrink-0 shadow-xs">
              {isLoading ? (
                <Sparkles className="w-5 h-5 text-white animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-brand-green-deep">
                {getStatusMessage()}
              </h2>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mt-4 overflow-hidden">
          <div
            className="bg-brand-green h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(100, Math.max(10, (generatedCount / 10) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* 5-Day Live Timetable Stream */}
      <div className="space-y-6">
        {DAY_NAMES.map((dayName, dayIndex) => {
          const dayLessons = lessons.filter((l) => l?.dayOffset === dayIndex);
          const hasDayStarted = dayLessons.length > 0;
          const isCurrentDayGenerating =
            isLoading &&
            (maxDayOffset === dayIndex || (maxDayOffset === -1 && dayIndex === 0));

          return (
            <div key={dayIndex} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-green flex items-center gap-2">
                  <span>{dayName}</span>
                  {hasDayStarted ? (
                    <span className="text-[10px] bg-brand-mint text-brand-green-deep px-2 py-0.5 rounded-full font-semibold normal-case tracking-normal">
                      {dayLessons.length} lesson{dayLessons.length !== 1 ? "s" : ""}
                    </span>
                  ) : isCurrentDayGenerating ? (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium normal-case tracking-normal animate-pulse">
                      Generating now...
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 font-normal normal-case tracking-normal">
                      Upcoming
                    </span>
                  )}
                </h3>
              </div>

              <div className="space-y-3">
                {hasDayStarted ? (
                  dayLessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-[hsl(var(--border))] p-4 shadow-2xs transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shrink-0",
                              subjectDotColor(lesson?.subject)
                            )}
                          />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {lesson?.subject || "Subject"}
                          </span>
                          <span className="text-xs text-muted-foreground/70 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson?.durationMins ?? 45} min
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-brand-green bg-brand-mint/60 px-2 py-0.5 rounded-md">
                          {lesson?.topic || "Drafting topic..."}
                        </span>
                      </div>

                      <h4 className="font-display font-semibold text-brand-green-deep text-sm leading-snug mb-1">
                        {lesson?.title || "Drafting lesson title..."}
                      </h4>

                      {lesson?.description ? (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {lesson.description}
                        </p>
                      ) : (
                        <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4 mt-1" />
                      )}
                    </div>
                  ))
                ) : (
                  // Day skeleton shimmer while pending
                  <div className="bg-white/60 rounded-2xl border border-dashed border-[hsl(var(--border))] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-muted animate-pulse" />
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 bg-muted/80 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-muted/40 rounded animate-pulse w-full" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
