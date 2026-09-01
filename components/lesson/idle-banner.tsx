"use client";

import { Play, PauseCircle, X } from "lucide-react";

interface IdleBannerProps {
  onResume: () => void;
  onDismiss: () => void;
}

export function IdleBanner({ onResume, onDismiss }: IdleBannerProps) {
  return (
    <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 print:hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
          <PauseCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 leading-snug">
            Lesson paused due to inactivity
          </p>
          <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
            We paused the timer so idle time won&apos;t skew your learning progress. Tap resume when you&apos;re ready.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={onResume}
          className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Resume Lesson
        </button>
        <button
          onClick={onDismiss}
          className="w-8 h-8 flex items-center justify-center text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-100/60 transition-colors"
          title="Dismiss notice"
          aria-label="Dismiss notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
