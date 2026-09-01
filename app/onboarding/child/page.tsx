"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronLeft,
  Loader2,
  Check,
  Star,
  Zap,
} from "lucide-react";
import { AgeCarousel } from "@/components/onboarding/age-carousel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildData {
  name: string;
  age: number;
  interests: string[];
  learningStyle: string;
}

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Name & age", "Interests", "Confirmation"];
const STORAGE_KEY_CHILD_DATA = "planned:onboarding_child:data";
const STORAGE_KEY_CHILD_STEP = "planned:onboarding_child:step";

const INTERESTS = [
  { id: "drawing", label: "Drawing", emoji: "🎨" },
  { id: "reading", label: "Reading", emoji: "📚" },
  { id: "animals", label: "Animals", emoji: "🐾" },
  { id: "building", label: "Building", emoji: "🧱" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "cooking", label: "Cooking", emoji: "🍳" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "outdoors", label: "Outdoors", emoji: "🌿" },
  { id: "dancing", label: "Dancing", emoji: "💃" },
  { id: "crafts", label: "Crafts", emoji: "✂️" },
  { id: "films", label: "Films", emoji: "🎬" },
];

const LEARNING_STYLES = [
  {
    id: "visual",
    label: "Visual",
    description: "Learns best through pictures, diagrams, and videos",
    emoji: "👁️",
  },
  {
    id: "auditory",
    label: "Auditory",
    description: "Learns best by listening, discussing, and talking through ideas",
    emoji: "👂",
  },
  {
    id: "kinesthetic",
    label: "Hands-on",
    description: "Learns best by doing — experiments, making, and moving",
    emoji: "🤲",
  },
  {
    id: "reading-writing",
    label: "Reading & Writing",
    description: "Learns best through notes, lists, and written words",
    emoji: "✏️",
  },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Child onboarding progress"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuetext={`Step ${step} of ${TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
      className="flex items-center justify-center gap-2 mb-8"
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" aria-hidden="true">
          <div
            className={`transition-all duration-300 rounded-full flex items-center justify-center
              ${i + 1 < step
                ? "w-7 h-7 bg-brand-green text-white"
                : i + 1 === step
                ? "w-7 h-7 bg-brand-green-deep text-white ring-4 ring-brand-green/20"
                : "w-2 h-2 bg-muted-foreground/30"
              }`}
          >
            {i + 1 < step ? (
              <Check className="w-3.5 h-3.5" />
            ) : i + 1 === step ? (
              <span className="text-xs font-bold">{step}</span>
            ) : null}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div
              className={`h-0.5 w-8 rounded-full transition-colors ${
                i + 1 < step ? "bg-brand-green" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Age to year group ────────────────────────────────────────────────────────

function ageToYearGroup(age: number): string {
  const map: Record<number, string> = {
    4: "Reception", 5: "Year 1", 6: "Year 2", 7: "Year 3",
    8: "Year 4", 9: "Year 5", 10: "Year 6", 11: "Year 7",
  };
  return map[age] ?? "Year 1";
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function ChildOnboardingSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <CalendarCheck className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <div className="h-3.5 w-28 bg-muted animate-pulse rounded-full mb-1" />
          <div className="h-3 w-36 bg-muted/50 animate-pulse rounded-full mt-1" />
        </div>

        {/* Progress bar skeleton */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-muted/70 animate-pulse" />
              {i < TOTAL_STEPS - 1 && (
                <div className="h-0.5 w-8 rounded-full bg-muted/50 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Card Skeleton */}
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-3/5 bg-muted/80 animate-pulse rounded-xl" />
            <div className="h-4 w-4/5 bg-muted/50 animate-pulse rounded-lg" />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-muted/60 animate-pulse rounded" />
              <div className="h-11 w-full bg-muted/20 border border-border/40 animate-pulse rounded-xl" />
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="h-4 w-16 bg-muted/60 animate-pulse rounded" />
              <div className="h-14 w-full bg-muted/20 border border-border/40 animate-pulse rounded-xl" />
            </div>
          </div>

          {/* Action button skeleton */}
          <div className="pt-4 flex gap-3">
            <div className="flex-1 h-12 bg-brand-green/20 animate-pulse rounded-xl" />
          </div>
        </div>

        {/* Footer hint */}
        <div className="h-3 w-20 bg-muted/40 animate-pulse rounded mx-auto mt-4" />
      </div>
    </div>
  );
}

// ─── Child wizard ─────────────────────────────────────────────────────────────

function OnboardingChildContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");

  const [step, setStep] = useState<number>(1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<ChildData>({
    name: "",
    age: 7,
    interests: [],
    learningStyle: "",
  });
  const [paywallTier, setPaywallTier] = useState<"BASIC" | "PREMIUM" | null>(null);

  // 1. Initial hydration from localStorage & searchParams
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_CHILD_DATA);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === "object") {
          setData((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      }

      if (stepParam) {
        const parsedStep = parseInt(stepParam, 10);
        if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= TOTAL_STEPS) {
          setStep(parsedStep);
        } else {
          setStep(1);
          router.replace(`/onboarding/child?step=1`, { scroll: false });
        }
      } else {
        const savedStep = localStorage.getItem(STORAGE_KEY_CHILD_STEP);
        const targetStep = savedStep ? parseInt(savedStep, 10) : 1;
        const validStep = !isNaN(targetStep) && targetStep >= 1 && targetStep <= TOTAL_STEPS ? targetStep : 1;
        setStep(validStep);
        router.replace(`/onboarding/child?step=${validStep}`, { scroll: false });
      }
    } catch (e) {
      console.error("Failed to restore child onboarding state:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. React to stepParam changes (browser back/forward navigation)
  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_STEPS) {
        setStep(parsed);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_CHILD_STEP, String(parsed));
          } catch (e) {}
        }
      }
    }
  }, [stepParam]);

  // 3. Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_CHILD_DATA, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save child onboarding data:", e);
    }
  }, [data, isHydrated]);

  function goToStep(targetStep: number) {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, targetStep));
    setStep(clamped);
    setError("");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_CHILD_STEP, String(clamped));
      } catch (e) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    router.push(`/onboarding/child?step=${clamped}`, { scroll: false });
  }

  function update(patch: Partial<ChildData>) {
    setData((prev) => ({ ...prev, ...patch }));
    setError("");
    setPaywallTier(null);
  }

  function toggleInterest(id: string) {
    update({
      interests: data.interests.includes(id)
        ? data.interests.filter((i) => i !== id)
        : [...data.interests, id],
    });
  }

  function handleNext() {
    if (step === 1) {
      if (!data.name.trim()) { setError("Please enter your child's name."); return; }
    }
    if (step === 2) {
      if (data.interests.length === 0) { setError("Choose at least one interest."); return; }
      if (!data.learningStyle) { setError("Choose a learning style."); return; }
    }
    setError("");
    goToStep(step + 1);
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        age: data.age,
        interests: data.interests,
        learningStyle: data.learningStyle,
        yearGroup: ageToYearGroup(data.age),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong. Please try again.");
      if (body.paywall && (body.requiredTier === "BASIC" || body.requiredTier === "PREMIUM")) {
        setPaywallTier(body.requiredTier);
      }
      return;
    }

    // Auto-select the newly created child so the dashboard opens on their
    // profile (instead of whichever child was previously active).
    const body = await res.json().catch(() => null);
    if (body?.child?.id) {
      localStorage.setItem("planned:activeChildId", body.child.id);
    }

    // Clear saved child onboarding draft
    try {
      localStorage.removeItem(STORAGE_KEY_CHILD_DATA);
      localStorage.removeItem(STORAGE_KEY_CHILD_STEP);
    } catch (e) {
      console.error("Failed to clean up child onboarding draft:", e);
    }

    // Use a full-page navigation rather than router.push() + refresh().
    // Next.js's client-side cache was occasionally serving the
    // pre-add layout (no new child in the sidebar dropdown) even after
    // router.refresh(). A hard navigation guarantees the dashboard
    // mounts fresh with the new child included.
    window.location.assign("/dashboard");
  }

  if (!isHydrated) {
    return <ChildOnboardingSkeleton />;
  }

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen">
      {/* Screen reader live region for step navigation */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Step ${step} of ${TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
      </div>

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4" aria-hidden="true">
            <CalendarCheck className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-green mb-1">
            {STEP_LABELS[step - 1]}
          </p>
          <p className="text-sm text-muted-foreground">Your child&apos;s profile</p>
        </div>

        <ProgressBar step={step} />

        <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden">

          {/* ── Step 1: Name & age ── */}
          {step === 1 && (
            <div className="p-5 sm:p-8 space-y-6">
              <div>
                <h2 id="child-basics-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                  Tell us about your child
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll use this to personalise every lesson just for them.
                </p>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="child-onboarding-name" className="text-sm font-medium text-brand-green-deep block mb-1.5">
                  Child&apos;s name
                </label>
                <input
                  id="child-onboarding-name"
                  type="text"
                  value={data.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. Amelia"
                  className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                />
              </div>

              {/* Age Carousel */}
              <AgeCarousel
                value={data.age}
                onChange={(age) => update({ age })}
              />
            </div>
          )}

          {/* ── Step 2: Interests & learning style ── */}
          {step === 2 && (
            <div className="p-5 sm:p-8 space-y-6">
              <div>
                <h2 id="child-interests-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                  What does {data.name || "your child"} love?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Lessons are more fun when they connect to what your child already cares about.
                </p>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Interests */}
              <div>
                <span id="interests-group-label" className="text-sm font-medium text-brand-green-deep mb-3 block">
                  Interests <span className="text-muted-foreground font-normal">(choose any)</span>
                </span>
                <div role="group" aria-labelledby="interests-group-label" className="flex flex-wrap gap-2">
                  {INTERESTS.map(({ id, label, emoji }) => {
                    const selected = data.interests.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleInterest(id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                          ${selected
                            ? "border-brand-green bg-brand-mint text-brand-green-deep"
                            : "border-border/60 bg-white text-muted-foreground hover:border-brand-green/40"
                          }`}
                      >
                        <span aria-hidden="true">{emoji}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Learning style */}
              <div>
                <span id="learning-style-label" className="text-sm font-medium text-brand-green-deep mb-3 block">
                  Learning style <span className="text-muted-foreground font-normal">(pick one)</span>
                </span>
                <div role="radiogroup" aria-labelledby="learning-style-label" className="grid grid-cols-2 gap-2">
                  {LEARNING_STYLES.map(({ id, label, description, emoji }) => {
                    const selected = data.learningStyle === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update({ learningStyle: id })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                          ${selected
                            ? "border-brand-green bg-brand-mint"
                            : "border-border/60 bg-white hover:border-brand-green/40 hover:bg-brand-mint/30"
                          }`}
                      >
                        <span aria-hidden="true" className="text-2xl block mb-2">{emoji}</span>
                        <p className={`text-sm font-semibold ${selected ? "text-brand-green-deep" : "text-foreground"}`}>
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirmation card ── */}
          {step === 3 && (
            <div className="p-5 sm:p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  Meet {data.name}! 🎉
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Here&apos;s how we&apos;ve built their profile. You can always edit this later.
                </p>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Profile card */}
              <div className="planned-gradient-soft rounded-2xl p-6 space-y-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm" aria-hidden="true">
                    <span className="text-3xl">
                      {data.interests[0]
                        ? INTERESTS.find((i) => i.id === data.interests[0])?.emoji ?? "⭐"
                        : "⭐"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-brand-green-deep">
                      {data.name}
                    </h3>
                    <p className="text-sm text-brand-green-deep/70">
                      Age {data.age} · {ageToYearGroup(data.age)}
                    </p>
                    {/* Bloom stars */}
                    <div className="flex gap-0.5 mt-1" aria-hidden="true">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                      <span className="text-xs text-brand-green-deep/60 ml-1">Just getting started</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 bg-white/60 rounded-xl p-4">
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0">Learning style</span>
                    <span className="text-brand-green-deep font-medium capitalize">
                      {LEARNING_STYLES.find((l) => l.id === data.learningStyle)?.label ?? "—"}
                    </span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0">Interests</span>
                    <span className="text-brand-green-deep font-medium">
                      {data.interests.length > 0
                        ? data.interests
                            .slice(0, 4)
                            .map((id) => INTERESTS.find((i) => i.id === id)?.label)
                            .join(", ")
                        : "—"}
                      {data.interests.length > 4 && ` +${data.interests.length - 4} more`}
                    </span>
                  </div>
                </div>

                {/* Bloom intro */}
                <div className="bg-white/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-brand-green-deep uppercase tracking-wide mb-1">
                    <span aria-hidden="true">🌸 </span>Bloom rewards
                  </p>
                  <p className="text-sm text-brand-green-deep/80">
                    {data.name} will earn Bloom stars for every completed lesson. They can trade them in for rewards you set.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation footer */}
          <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 h-12 rounded-xl border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
              >
                <ChevronLeft aria-hidden="true" className="w-4 h-4" />
                Back
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-12 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                Continue
              </button>
            ) : paywallTier ? (
              <Link
                href="/pricing"
                className="flex-1 h-12 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                <Zap aria-hidden="true" className="w-4 h-4" />
                Upgrade to {paywallTier === "BASIC" ? "Basic" : "Premium"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex-1 h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                {loading && <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />}
                Start planning with {data.name}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}

export default function OnboardingChildPage() {
  return (
    <Suspense fallback={<ChildOnboardingSkeleton />}>
      <OnboardingChildContent />
    </Suspense>
  );
}
