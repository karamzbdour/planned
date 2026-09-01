"use client";

import { memo } from "react";
import { Play, Pause, CheckCircle, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyLessonHudProps {
  status: string;
  isPaused: boolean;
  isIdle: boolean;
  formattedTime: string;
  statusLoading: boolean;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  isVisible: boolean;
}

export const StickyLessonHud = memo(function StickyLessonHud({
  status,
  isPaused,
  isIdle,
  formattedTime,
  statusLoading,
  onPause,
  onResume,
  onComplete,
  isVisible,
}: StickyLessonHudProps) {
  if (status !== "IN_PROGRESS") return null;

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isPausedOrIdle = isPaused || isIdle;

  return (
    <aside
      aria-label="Lesson floating timer controls"
      className={cn(
        "fixed top-4 right-4 sm:top-5 sm:right-6 z-40 select-none print:hidden",
        "bg-white/95 border border-[hsl(var(--border))] rounded-full shadow-lg shadow-black/5 p-1.5 pl-2.5",
        "flex items-center gap-2",
        "transform-gpu will-change-transform transition-all duration-200 ease-out",
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-3 opacity-0 scale-95 pointer-events-none"
      )}
    >
      {/* Timer badge */}
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
          isPausedOrIdle
            ? "bg-amber-100 text-amber-800"
            : "bg-brand-mint text-brand-green"
        )}
      >
        {/* Stable, non-wobbling indicator dot with fixed dimensions */}
        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
          {!isPausedOrIdle && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              isPausedOrIdle ? "bg-amber-500" : "bg-brand-green"
            )}
          />
        </span>

        {/* Tabular numbers prevent digit-width shifts */}
        <span className="font-mono tabular-nums tracking-tight min-w-[3.25rem] text-center font-bold">
          {formattedTime}
        </span>

        {isIdle ? (
          <span className="text-[10px] uppercase font-bold text-amber-700">Idle</span>
        ) : isPaused ? (
          <span className="text-[10px] uppercase font-bold text-amber-700">Paused</span>
        ) : null}
      </div>

      {/* Pause / Resume Button */}
      <button
        onClick={isPausedOrIdle ? onResume : onPause}
        className={cn(
          "inline-flex items-center justify-center w-7 h-7 rounded-full border transition-colors shrink-0",
          isPausedOrIdle
            ? "bg-brand-green text-white hover:bg-brand-green-deep border-brand-green"
            : "bg-white text-muted-foreground hover:text-brand-green hover:bg-brand-mint/50 border-[hsl(var(--border))]"
        )}
        title={isPausedOrIdle ? "Resume lesson timer" : "Pause lesson timer"}
        aria-label={isPausedOrIdle ? "Resume lesson timer" : "Pause lesson timer"}
      >
        {isPausedOrIdle ? (
          <Play className="w-3 h-3 fill-current translate-x-[0.5px]" />
        ) : (
          <Pause className="w-3 h-3 fill-current" />
        )}
      </button>

      {/* Complete Button */}
      <button
        onClick={onComplete}
        disabled={statusLoading}
        className="inline-flex items-center gap-1 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors shadow-sm shrink-0"
        title="Mark lesson complete"
      >
        {statusLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">Complete</span>
      </button>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand-green hover:bg-brand-mint/50 border border-[hsl(var(--border))] transition-colors shrink-0"
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
});
