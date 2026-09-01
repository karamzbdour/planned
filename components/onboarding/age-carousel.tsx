"use client";

import { useMemo } from "react";
import { Sparkles, Minus, Plus } from "lucide-react";

export interface AgeOption {
  age: number;
  label: string;
  stage: string;
  description: string;
}

export const AGES: AgeOption[] = [
  {
    age: 4,
    label: "Reception",
    stage: "Early Years",
    description: "Play-based foundation",
  },
  {
    age: 5,
    label: "Year 1",
    stage: "Key Stage 1",
    description: "Foundational reading, writing, numbers.",
  },
  {
    age: 6,
    label: "Year 2",
    stage: "Key Stage 1",
    description: "Building confidence with independent reading.",
  },
  {
    age: 7,
    label: "Year 3", 
    stage: "Key Stage 2",
    description: "Deepening core skills.",
  },
  {
    age: 8,
    label: "Year 4",
    stage: "Key Stage 2",
    description: "Times tables mastery, scientific reasoning.",
  },
  {
    age: 9,
    label: "Year 5", 
    stage: "Key Stage 2",
    description: "Advanced literacy, fractions and geography.",
  },
  {
    age: 10,
    label: "Year 6",
    stage: "Key Stage 2",
    description: "Key Stage 2 consolidation, critical thinking.",
  },
  {
    age: 11,
    label: "Year 7",
    stage: "Key Stage 3",
    description: "Specialised subjects, independence.",
  },
];

export function ageToYearGroup(age: number): string {
  const match = AGES.find((a) => a.age === age);
  return match ? match.label : "Year 1";
}

interface AgeSliderProps {
  value: number;
  onChange: (age: number) => void;
  label?: string;
}

export function AgeCarousel({
  value,
  onChange,
  label = "Age & school year",
}: AgeSliderProps) {
  const selectedItem = useMemo(
    () => AGES.find((a) => a.age === value) ?? AGES[2],
    [value]
  );

  const percentage = Math.max(0, Math.min(100, ((value - 4) / 7) * 100));

  const handleDecrease = () => {
    if (value > 4) onChange(value - 1);
  };

  const handleIncrease = () => {
    if (value < 11) onChange(value + 1);
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Quick Increment Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <span id="child-age-slider-label" className="text-sm font-medium text-brand-green-deep block">
            {label}
          </span>
          <span className="text-xs text-muted-foreground">
            Choose your child&apos;s age to tailor lessons to their learning stage.
          </span>
        </div>

        {/* Quick Stepper Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Decrease age"
            onClick={handleDecrease}
            disabled={value <= 4}
            className="w-8 h-8 rounded-xl border border-input bg-white hover:bg-muted disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Increase age"
            onClick={handleIncrease}
            disabled={value >= 11}
            className="w-8 h-8 rounded-xl border border-input bg-white hover:bg-muted disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Featured Current Age Display Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-mint/40 via-white to-brand-mint/20 border border-brand-green/20 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
            <span className="font-display text-2xl font-bold">{selectedItem.age}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-brand-green-deep">
                {selectedItem.label}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green-deep text-[10px] font-bold uppercase tracking-wider">
                {selectedItem.stage}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
              {selectedItem.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sliding Progress Track ── */}
      <div className="relative pt-6 pb-2 px-4 select-none">
        {/* Background Rail */}
        <div className="h-3 w-full bg-muted/60 rounded-full relative overflow-hidden shadow-inner">
          {/* Active Gradient Progress Bar */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Step Tick Marks along rail */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 mt-2 flex justify-between pointer-events-none">
          {AGES.map((item) => {
            const isPassed = item.age <= value;
            return (
              <div
                key={item.age}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isPassed
                    ? "bg-white ring-2 ring-brand-green scale-110 shadow-xs"
                    : "bg-muted-foreground/30"
                }`}
              />
            );
          })}
        </div>

        {/* Sliding Circle Thumb with Tooltip */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 mt-2 pointer-events-none transition-all duration-300 ease-out z-10"
          style={{ left: `calc(16px + (${percentage} / 100) * (100% - 32px))` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Tooltip Badge */}
            <div className="absolute -top-8 px-2 py-0.5 rounded-md bg-brand-green-deep text-white text-[11px] font-bold shadow-md whitespace-nowrap">
              Age {value}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-green-deep" />
            </div>

            {/* Circle Handle */}
            <div className="w-8 h-8 rounded-full bg-white border-[3px] border-brand-green shadow-md ring-4 ring-brand-green/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
            </div>
          </div>
        </div>

        {/* Transparent Range Input Overlay for Drag & Keyboard Interaction */}
        <input
          type="range"
          min={4}
          max={11}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-labelledby="child-age-slider-label"
          aria-valuemin={4}
          aria-valuemax={11}
          aria-valuenow={value}
          aria-valuetext={`Age ${value}, ${selectedItem.label}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
      </div>

      {/* Min / Max Range Boundary Labels */}
      <div className="flex justify-between px-4 text-xs font-medium text-muted-foreground" aria-hidden="true">
        <span>Age 4 (Reception)</span>
        <span>Age 11 (Year 7)</span>
      </div>
    </div>
  );
}

// Export alias for flexible naming
export const AgeSlider = AgeCarousel;
