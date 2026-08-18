"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, BookOpen, X, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompletionFeedbackData {
  bloom?: {
    starsGained: number;
    totalStars: number;
    currentLevel?: { label: string; emoji: string; minStars: number };
    nextLevel?: { label: string; emoji: string; minStars: number } | null;
    starsToNextLevel?: number;
  };
  mastery?: {
    subject: string;
    previousLevel: string;
    newLevel: string;
    levelChanged: boolean;
    levelUp: boolean;
    ratio: number;
    topicsCompleted?: number;
    topicsTotal?: number;
    objectivesMet?: number;
    totalObjectives?: number;
    nextTierRequirements?: {
      nextTier: string;
      nextTierLabel: string;
      targetRatio: number;
      targetTopics: number;
      neededObjectives: number;
      neededTopics: number;
      progressPercent: number;
    } | null;
  };
  newBadges?: {
    type: string;
    label: string;
    description: string;
    emoji: string;
  }[];
}

interface LessonCompletionModalProps {
  isOpen: boolean;
  childName: string;
  lessonTitle: string;
  subject: string;
  feedback: CompletionFeedbackData | null;
  onClose: () => void;
  onOpenJournal: () => void;
}

const TIER_COLORS: Record<string, string> = {
  EMERGING: "bg-amber-100 text-amber-800",
  DEVELOPING: "bg-blue-100 text-blue-800",
  SECURE: "bg-emerald-100 text-emerald-800",
  EXCEEDING: "bg-purple-100 text-purple-800",
};

export function LessonCompletionModal({
  isOpen,
  childName,
  subject,
  feedback,
  onClose,
  onOpenJournal,
}: LessonCompletionModalProps) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimateIn(true), 30);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const starsGained = feedback?.bloom?.starsGained ?? 3;
  const totalStars = feedback?.bloom?.totalStars ?? 0;
  const mastery = feedback?.mastery;
  const isLevelUp = mastery?.levelUp;
  const currentTier = (mastery?.newLevel || "DEVELOPING").toUpperCase();
  const nextReqs = mastery?.nextTierRequirements;
  const newBadges = feedback?.newBadges ?? [];

  // Short requirement summary
  let nextRequirementSummary = "";
  if (nextReqs) {
    const parts: string[] = [];
    if (nextReqs.neededTopics > 0) {
      parts.push(`${nextReqs.neededTopics} more ${nextReqs.neededTopics === 1 ? "lesson" : "lessons"}`);
    }
    if (nextReqs.neededObjectives > 0) {
      parts.push(`${nextReqs.neededObjectives} more ${nextReqs.neededObjectives === 1 ? "objective" : "objectives"}`);
    }
    nextRequirementSummary = parts.length > 0 ? `Need ${parts.join(" & ")}` : "Almost at threshold";
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-sm bg-white rounded-2xl border border-[hsl(var(--border))] shadow-xl overflow-hidden transition-all duration-200",
          animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="p-5 pb-3 text-center relative border-b border-[hsl(var(--border))]">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-muted-foreground/60 hover:text-foreground p-1 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-brand-mint text-brand-green-deep flex items-center justify-center text-lg">
            🎉
          </div>
          <h2 className="text-base font-bold font-display text-foreground">
            Lesson Completed!
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Great effort, {childName}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          {/* 1. Bloom Stars feedback */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-white flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  +{starsGained} Bloom Stars
                </p>
                <p className="text-[10px] text-amber-800/80">
                  Total: {totalStars} stars
                </p>
              </div>
            </div>
          </div>

          {/* 2. Mastery Feedback */}
          {isLevelUp ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Level Up in {subject}!</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Advanced to <strong className="uppercase">{mastery.newLevel}</strong> Mastery.
              </p>
            </div>
          ) : currentTier === "EXCEEDING" ? (
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-900">{subject} Mastery</span>
                <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-purple-100 text-purple-800">
                  Exceeding (Top)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
                  <span>{subject} Mastery</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded font-bold uppercase text-[10px]",
                      TIER_COLORS[currentTier] ?? "bg-blue-100 text-blue-800"
                    )}
                  >
                    {currentTier}
                  </span>
                  {nextReqs && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      → {nextReqs.nextTierLabel}
                    </span>
                  )}
                </div>
              </div>

              {nextReqs && (
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(10, nextReqs.progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{nextRequirementSummary}</span>
                    <span className="font-semibold text-brand-green-deep">
                      {nextReqs.progressPercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. New badge (if any) */}
          {newBadges.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-violet-50 border border-violet-200 text-xs">
              <span className="text-base">{newBadges[0].emoji}</span>
              <div className="min-w-0">
                <p className="font-bold text-violet-950 text-xs">
                  New Badge: {newBadges[0].label}
                </p>
                <p className="text-[10px] text-violet-700 truncate">
                  {newBadges[0].description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 bg-muted/20 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
          >
            Done
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenJournal();
            }}
            className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-deep text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Add journal note
          </button>
        </div>
      </div>
    </div>
  );
}
