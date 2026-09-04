"use client";

import { Star, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BloomBarProps {
  childName: string;
  bloomStars: number;
  nextReward: { id: string; name: string; starsRequired: number } | null;
}

export function BloomBar({ childName, bloomStars, nextReward }: BloomBarProps) {
  if (!nextReward) {
    return (
      <div className="bg-gradient-to-r from-[#EFF4F6] via-[#FAF6ED] to-[#FBF5E8] border border-[#EAE3D2] rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-[#FDF6E7] border border-[#E9CE98] flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-[#C98A2C] fill-[#C98A2C]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green-deep">
            <span className="font-serif font-bold text-base text-brand-green-deep">{bloomStars}</span> Bloom stars earned
          </p>
          <p className="text-xs text-brand-green-deep/70 mt-0.5">
            No rewards set yet — add one in the Bloom tab!
          </p>
        </div>
      </div>
    );
  }

  const starsNeeded = Math.max(nextReward.starsRequired - bloomStars, 0);
  const pct = Math.min(
    Math.round((bloomStars / nextReward.starsRequired) * 100),
    100
  );

  return (
    <div className="bg-gradient-to-r from-[#EFF4F6] via-[#FAF6ED] to-[#FBF5E8] border border-[#EAE3D2] rounded-2xl px-5 py-4 shadow-2xs">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/90 border border-[#EAE3D2] flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-brand-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-green-deep">
            {starsNeeded === 0
              ? `🎉 ${childName} can unlock: ${nextReward.name}!`
              : `${childName} needs ${starsNeeded} more star${starsNeeded === 1 ? "" : "s"} to unlock:`}
          </p>
          {starsNeeded > 0 && (
            <p className="text-xs font-medium text-brand-green-deep/70 truncate mt-0.5">
              {nextReward.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-white/70 px-2.5 py-1 rounded-xl border border-[#EAE3D2]/60">
          <Star className="w-4 h-4 text-[#C98A2C] fill-[#C98A2C]" />
          <span className="font-serif text-sm font-bold text-brand-green-deep">
            {bloomStars}
          </span>
          <span className="text-xs text-brand-green-deep/60">
            / {nextReward.starsRequired}
          </span>
        </div>
      </div>
      <Progress
        value={pct}
        className="h-2 bg-white/70 border border-[#EAE3D2]/50"
      />
    </div>
  );
}
