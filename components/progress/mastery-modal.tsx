"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  TrendingUp,
  Award,
} from "lucide-react";
import { MASTERY_TIER_CONFIG, MasteryTier } from "@/lib/mastery";
import { cn } from "@/lib/utils";

interface MasteryModalProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  childId: string;
  childName: string;
  currentLevel: string;
  isManualOverride: boolean;
  objectivesMet: number;
  totalObjectives: number;
  topicsCompleted: number;
  nextTierRequirements?: {
    nextTier: MasteryTier;
    targetRatio: number;
    targetTopics: number;
    neededObjectives: number;
    neededTopics: number;
  };
  onCalibrateSuccess: (newLevel: string, isManual: boolean) => void;
}

export function MasteryModal({
  open,
  onClose,
  subject,
  childId,
  childName,
  currentLevel,
  isManualOverride: initialIsManual,
  objectivesMet,
  totalObjectives,
  topicsCompleted,
  nextTierRequirements,
  onCalibrateSuccess,
}: MasteryModalProps) {
  const [isManual, setIsManual] = useState(initialIsManual);
  const [selectedLevel, setSelectedLevel] = useState<MasteryTier>(
    (currentLevel as MasteryTier) || "DEVELOPING"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIsManual(initialIsManual);
      setSelectedLevel((currentLevel as MasteryTier) || "DEVELOPING");
      setError(null);
    }
  }, [open, initialIsManual, currentLevel]);

  if (!open) return null;

  const validCurrentLevel = (
    ["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"].includes(currentLevel)
      ? currentLevel
      : "DEVELOPING"
  ) as MasteryTier;

  const currentConfig = MASTERY_TIER_CONFIG[validCurrentLevel];
  const ratioPct =
    totalObjectives > 0 ? Math.round((objectivesMet / totalObjectives) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/progress/${encodeURIComponent(subject)}/calibrate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            masteryLevel: isManual ? selectedLevel : undefined,
            isManualOverride: isManual,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update mastery level");
      const data = await res.json();
      onCalibrateSuccess(data.masteryLevel, data.isManualOverride);
      onClose();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tiers: MasteryTier[] = ["EMERGING", "DEVELOPING", "SECURE", "EXCEEDING"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-mint flex items-center justify-center text-brand-green">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-brand-green-deep">
                Mastery Progression
              </h2>
              <p className="text-xs text-muted-foreground">
                {subject} • {childName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Current Status Card */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Current Level:
              </span>
              <span
                className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full font-bold",
                  currentConfig.bgClass,
                  currentConfig.textClass
                )}
              >
                {currentConfig.label}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {objectivesMet}/{totalObjectives} objectives ({ratioPct}%)
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentConfig.description}
          </p>

          {/* Next tier requirement progress */}
          {nextTierRequirements && !isManual && (
            <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-brand-green font-medium">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>
                Next: {MASTERY_TIER_CONFIG[nextTierRequirements.nextTier].label} (
                {nextTierRequirements.neededObjectives > 0
                  ? `Need ${nextTierRequirements.neededObjectives} more objective${nextTierRequirements.neededObjectives > 1 ? "s" : ""}`
                  : "Objectives met"}
                {nextTierRequirements.neededTopics > 0
                  ? ` & ${nextTierRequirements.neededTopics} more topic${nextTierRequirements.neededTopics > 1 ? "s" : ""}`
                  : ""}
                )
              </span>
            </div>
          )}
        </div>

        {/* Mode Toggle: Auto vs Manual */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-green" />
              <span className="text-sm font-semibold text-brand-green-deep">
                Progression Mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsManual((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors",
                isManual
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-brand-mint/50 border-brand-green/30 text-brand-green-deep"
              )}
            >
              {isManual ? (
                <>
                  <Lock className="w-3 h-3" />
                  Manual Override
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  Adaptive (Auto)
                </>
              )}
            </button>
          </div>

          {/* Tier Selection Grid (if manual override is enabled) */}
          {isManual ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Select a tier to manually lock for {childName}:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tiers.map((tier) => {
                  const config = MASTERY_TIER_CONFIG[tier];
                  const isSelected = selectedLevel === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedLevel(tier)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        isSelected
                          ? "border-brand-green bg-brand-mint/40 shadow-sm"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-bold",
                            config.bgClass,
                            config.textClass
                          )}
                        >
                          {config.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-brand-green" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed bg-brand-mint/20 p-3 rounded-xl border border-brand-green/10">
              <Sparkles className="w-3.5 h-3.5 text-brand-green inline mr-1" />
              <strong>Adaptive Mode Enabled</strong>: Mastery advances dynamically
              as {childName} completes lessons and achieves curriculum objectives.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 transition-all shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
