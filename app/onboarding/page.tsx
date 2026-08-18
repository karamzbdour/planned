"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  ChevronLeft,
  Check,
  GraduationCap,
  Heart,
  Compass,
  Wrench,
  Palette,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Minus,
  User,
  Sparkles,
  RefreshCw,
  BookOpen,
  Target,
  Lightbulb,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChildInput {
  name: string;
  age: number;
  interests: string[];
  learningStyle: string;
}

interface WizardData {
  // Step 1 — goals
  goals: string[];
  // Step 2 — curriculum
  curriculum: "BNC" | "MONTESSORI" | "UNSCHOOLING" | "";
  // Step 3 — faith
  faith: "ISLAM" | "CHRISTIANITY" | "JUDAISM" | "SECULAR" | "";
  faithIntegration: boolean;
  // Step 4 — location
  location: string;
  // Step 5 — children
  children: ChildInput[];
  // Step 6 — account credentials
  name: string;
  email: string;
  password: string;
}

export interface PreviewLesson {
  subject: string;
  topic: string;
  headline: string;
  description: string;
  learningObjective: string;
  tailoredActivity: {
    title: string;
    instructions: string;
    badge: string;
  };
  localDayOut?: {
    venue: string;
    idea: string;
  };
  faithReflection?: string;
}

const TOTAL_STEPS = 6;
const PREVIEW_SUBJECTS = ["Science", "Maths", "Art", "History", "English"];

const STEP_LABELS = [
  "Goals",
  "Curriculum",
  "Faith & culture",
  "Location",
  "Children",
  "Create account",
];

const STORAGE_KEY_DATA = "planned:onboarding:data";
const STORAGE_KEY_STEP = "planned:onboarding:step";
const STORAGE_KEY_CHILD_IDX = "planned:onboarding:activeChildIndex";

const GOALS = [
  { id: "academics", label: "Strong academics", icon: <GraduationCap className="w-5 h-5" /> },
  { id: "faith", label: "Faith-centred learning", icon: <Heart className="w-5 h-5" /> },
  { id: "child-led", label: "Child-led discovery", icon: <Compass className="w-5 h-5" /> },
  { id: "life-skills", label: "Life skills", icon: <Wrench className="w-5 h-5" /> },
  { id: "creative", label: "Creative expression", icon: <Palette className="w-5 h-5" /> },
  { id: "routine", label: "Structured routine", icon: <Clock className="w-5 h-5" /> },
];

const CURRICULA = [
  {
    id: "BNC",
    label: "British National Curriculum",
    description:
      "Follow the KS1–KS4 framework used in state schools. Clear progression, familiar structure, great for exams later on.",
  },
  {
    id: "MONTESSORI",
    label: "Montessori",
    description:
      "Child-paced, hands-on learning through exploration. Focuses on independence, creativity, and intrinsic motivation.",
  },
  {
    id: "UNSCHOOLING",
    label: "Unschooling / Child-led",
    description:
      "Fully child-directed learning — following interests wherever they lead. Total freedom, maximum curiosity.",
  },
];

const FAITHS = [
  { id: "ISLAM", label: "Islam", emoji: "☪️" },
  { id: "CHRISTIANITY", label: "Christianity", emoji: "✝️" },
  { id: "JUDAISM", label: "Judaism", emoji: "✡️" },
  { id: "SECULAR", label: "Secular / No preference", emoji: "🌍" },
];

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
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuetext={`Step ${step} of ${TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
      className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8"
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
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
              className={`h-0.5 w-4 sm:w-7 rounded-full transition-colors ${
                i + 1 < step ? "bg-brand-green" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function OnboardingSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <CalendarCheck className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <div className="h-3.5 w-24 bg-muted animate-pulse rounded-full mb-1" />
        </div>

        {/* Progress bar skeleton */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 rounded-full bg-muted/70 animate-pulse" />
              {i < TOTAL_STEPS - 1 && (
                <div className="h-0.5 w-4 sm:w-7 rounded-full bg-muted/50 animate-pulse" />
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

          <div className="grid grid-cols-2 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl border border-border/40 bg-muted/20 animate-pulse p-4 flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-lg bg-muted/60 shrink-0" />
                <div className="h-3.5 w-24 bg-muted/60 rounded" />
              </div>
            ))}
          </div>

          {/* Action button skeleton */}
          <div className="pt-4 flex gap-3">
            <div className="flex-1 h-11 bg-brand-green/20 animate-pulse rounded-xl" />
          </div>
        </div>

        {/* Footer hint */}
        <div className="h-3 w-20 bg-muted/40 animate-pulse rounded mx-auto mt-4" />
      </div>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");

  const [step, setStep] = useState<number>(1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  // AI Preview state
  const [previewSubject, setPreviewSubject] = useState("Science");
  const [previewLesson, setPreviewLesson] = useState<PreviewLesson | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [data, setData] = useState<WizardData>({
    name: "",
    email: "",
    password: "",
    goals: [],
    curriculum: "",
    faith: "",
    faithIntegration: false,
    location: "",
    children: [
      {
        name: "",
        age: 6,
        interests: [],
        learningStyle: "visual",
      },
    ],
  });

  // 1. Initial hydration from localStorage & searchParams
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === "object") {
          setData((prev) => ({
            ...prev,
            ...parsed,
            password: "", // do not restore password for safety
          }));
        }
      }

      const savedChildIdx = localStorage.getItem(STORAGE_KEY_CHILD_IDX);
      if (savedChildIdx !== null) {
        const idx = parseInt(savedChildIdx, 10);
        if (!isNaN(idx) && idx >= 0) {
          setActiveChildIndex(idx);
        }
      }

      if (stepParam) {
        const parsedStep = parseInt(stepParam, 10);
        if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= TOTAL_STEPS) {
          setStep(parsedStep);
        } else {
          setStep(1);
          router.replace(`/onboarding?step=1`, { scroll: false });
        }
      } else {
        const savedStep = localStorage.getItem(STORAGE_KEY_STEP);
        const targetStep = savedStep ? parseInt(savedStep, 10) : 1;
        const validStep = !isNaN(targetStep) && targetStep >= 1 && targetStep <= TOTAL_STEPS ? targetStep : 1;
        setStep(validStep);
        router.replace(`/onboarding?step=${validStep}`, { scroll: false });
      }
    } catch (e) {
      console.error("Failed to restore onboarding state:", e);
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
            localStorage.setItem(STORAGE_KEY_STEP, String(parsed));
          } catch (e) {}
        }
      }
    }
  }, [stepParam]);

  // 3. Save data and active child index to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const dataToSave = { ...data, password: "" };
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed to save onboarding data:", e);
    }
  }, [data, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_CHILD_IDX, String(activeChildIndex));
    } catch (e) {
      console.error("Failed to save child index:", e);
    }
  }, [activeChildIndex, isHydrated]);

  function goToStep(targetStep: number) {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, targetStep));
    setStep(clamped);
    setError("");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_STEP, String(clamped));
      } catch (e) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    router.push(`/onboarding?step=${clamped}`, { scroll: false });
  }

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
    setError("");
  }

  function toggleGoal(id: string) {
    update({
      goals: data.goals.includes(id)
        ? data.goals.filter((g) => g !== id)
        : [...data.goals, id],
    });
  }

  function updateChild(index: number, patch: Partial<ChildInput>) {
    setData((prev) => {
      const updated = [...prev.children];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, children: updated };
    });
    setError("");
  }

  function addChild() {
    setData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          name: "",
          age: 6,
          interests: [],
          learningStyle: "visual",
        },
      ],
    }));
    setActiveChildIndex(data.children.length);
    setError("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function removeChild(index: number) {
    if (data.children.length <= 1) return;
    setData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
    if (activeChildIndex >= index && activeChildIndex > 0) {
      setActiveChildIndex((i) => i - 1);
    }
    setError("");
  }

  function toggleChildInterest(childIndex: number, interestId: string) {
    const currentInterests = data.children[childIndex].interests;
    const nextInterests = currentInterests.includes(interestId)
      ? currentInterests.filter((id) => id !== interestId)
      : [...currentInterests, interestId];
    updateChild(childIndex, { interests: nextInterests });
  }

  // ── AI Preview fetcher ──────────────────────────────────────────────────────

  const fetchPreview = useCallback(
    async (subjectToFetch = previewSubject) => {
      const child = data.children[0] || {
        name: "Your Child",
        age: 6,
        interests: ["nature"],
        learningStyle: "hands-on",
      };

      setPreviewLoading(true);
      try {
        const res = await fetch("/api/ai/preview-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childName: child.name,
            age: child.age,
            interests: child.interests,
            learningStyle: child.learningStyle,
            curriculum: data.curriculum,
            faith: data.faith,
            faithIntegration: data.faithIntegration,
            location: data.location,
            subject: subjectToFetch,
          }),
        });

        if (res.ok) {
          const body = await res.json();
          if (body.preview) {
            setPreviewLesson(body.preview);
          }
        }
      } catch (err) {
        console.error("Failed to load preview:", err);
      } finally {
        setPreviewLoading(false);
      }
    },
    [data, previewSubject]
  );

  useEffect(() => {
    if (step === 6 && !previewLesson) {
      fetchPreview();
    }
  }, [step, previewLesson, fetchPreview]);

  // ── Steps 1–5: Preference & Children navigation ───────────────────────────

  function handleNext() {
    if (step === 1 && data.goals.length === 0) {
      setError("Please choose at least one goal.");
      return;
    }
    if (step === 2 && !data.curriculum) {
      setError("Please choose a curriculum.");
      return;
    }
    if (step === 3 && !data.faith) {
      setError("Please choose an option.");
      return;
    }
    if (step === 4 && !data.location.trim()) {
      setError("Please enter your town or city.");
      return;
    }
    if (step === 5) {
      const unnamedIdx = data.children.findIndex((c) => !c.name.trim());
      if (unnamedIdx !== -1) {
        setActiveChildIndex(unnamedIdx);
        setError(`Please enter a name for Child #${unnamedIdx + 1}.`);
        return;
      }
      const noInterestsIdx = data.children.findIndex((c) => c.interests.length === 0);
      if (noInterestsIdx !== -1) {
        setActiveChildIndex(noInterestsIdx);
        const childName = data.children[noInterestsIdx].name || `Child #${noInterestsIdx + 1}`;
        setError(`Please select at least one interest for ${childName}.`);
        return;
      }
      // Prefetch preview for step 6
      fetchPreview(previewSubject);
    }
    setError("");
    goToStep(step + 1);
  }

  // ── Step 6: Account creation & Save all data ───────────────────────────────

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Register account
    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });

    if (!regRes.ok) {
      let errorMsg = "Something went wrong creating your account.";
      try {
        const body = await regRes.json();
        errorMsg = body.error ?? errorMsg;
      } catch {
        errorMsg = `Server error (${regRes.status}). Please check database connection and server logs.`;
      }
      if (regRes.status !== 409) {
        setError(errorMsg);
        setLoading(false);
        return;
      }
    }

    // 2. Sign in
    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("Could not sign in with these credentials. Please check your email and password.");
      setLoading(false);
      return;
    }

    // 3. Save family profile & preferences
    const familyRes = await fetch("/api/onboarding/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: data.goals,
        curriculum: data.curriculum,
        faith: data.faith,
        faithIntegration: data.faithIntegration,
        location: data.location,
      }),
    });

    if (!familyRes.ok) {
      const body = await familyRes.json();
      setError(body.error ?? "Something went wrong saving family setup. Please try again.");
      setLoading(false);
      return;
    }

    // 4. Save each child profile
    for (const child of data.children) {
      const childRes = await fetch("/api/onboarding/child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: child.name,
          age: child.age,
          interests: child.interests,
          learningStyle: child.learningStyle,
        }),
      });

      if (!childRes.ok) {
        const body = await childRes.json();
        setError(body.error ?? `Could not save profile for ${child.name}. Please try again.`);
        setLoading(false);
        return;
      }
    }

    // Clear saved draft on successful submission
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_STEP);
      localStorage.removeItem(STORAGE_KEY_CHILD_IDX);
    } catch (e) {
      console.error("Failed to clean up onboarding draft:", e);
    }

    setLoading(false);
    router.push("/dashboard");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const stepLabels = [
    "Goals",
    "Curriculum",
    "Faith & culture",
    "Location",
    "Children",
    "Create account",
  ];

  if (!isHydrated) {
    return <OnboardingSkeleton />;
  }

  const primaryChild = data.children[0] || { name: "Your child", age: 6 };

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen">
      {/* Screen reader live region for step navigation */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Step ${step} of ${TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
      </div>

      <div className={`w-full transition-all duration-300 ${step === 6 ? "max-w-5xl" : "max-w-lg"}`}>

        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4" aria-hidden="true">
            <CalendarCheck className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-green mb-1">
            {STEP_LABELS[step - 1]}
          </p>
        </div>

        <ProgressBar step={step} />

        {/* ── Steps 1–5: Single Card Flow ── */}
        {step >= 1 && step <= 5 && (
          <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden">

            {/* ── Step 1: Goals ── */}
            {step === 1 && (
              <div className="p-5 sm:p-8 space-y-5">
                <div>
                  <h2 id="goals-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                    What matters most to you?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose everything that resonates — we&apos;ll weave it into your lessons.
                  </p>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div role="group" aria-labelledby="goals-heading" className="grid grid-cols-2 gap-3">
                  {GOALS.map(({ id, label, icon }) => {
                    const selected = data.goals.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleGoal(id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                          ${selected
                            ? "border-brand-green bg-brand-mint text-brand-green-deep"
                            : "border-border/60 bg-white text-muted-foreground hover:border-brand-green/40 hover:bg-brand-mint/30"
                          }`}
                      >
                        <span aria-hidden="true" className={selected ? "text-brand-green" : "text-muted-foreground"}>
                          {icon}
                        </span>
                        <span className="text-sm font-medium leading-tight">{label}</span>
                        {selected && (
                          <Check aria-hidden="true" className="w-4 h-4 text-brand-green ml-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Curriculum ── */}
            {step === 2 && (
              <div className="p-5 sm:p-8 space-y-5">
                <div>
                  <h2 id="curriculum-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                    How do you like to teach?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your lessons will be generated to match this style.
                  </p>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div role="radiogroup" aria-labelledby="curriculum-heading" className="space-y-3">
                  {CURRICULA.map(({ id, label, description }) => {
                    const selected = data.curriculum === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update({ curriculum: id as WizardData["curriculum"] })}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                          ${selected
                            ? "border-brand-green bg-brand-mint"
                            : "border-border/60 bg-white hover:border-brand-green/40 hover:bg-brand-mint/30"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`font-semibold text-sm ${selected ? "text-brand-green-deep" : "text-foreground"}`}>
                              {label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {description}
                            </p>
                          </div>
                          <div
                            aria-hidden="true"
                            className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors
                            ${selected ? "border-brand-green bg-brand-green" : "border-muted-foreground/40"}`}
                          >
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 3: Faith ── */}
            {step === 3 && (
              <div className="p-5 sm:p-8 space-y-5">
                <div>
                  <h2 id="faith-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                    Faith and culture
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    When relevant, we can weave your faith values naturally into lessons — stories, references, and day-out suggestions.
                  </p>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div role="radiogroup" aria-labelledby="faith-heading" className="grid grid-cols-2 gap-3">
                  {FAITHS.map(({ id, label, emoji }) => {
                    const selected = data.faith === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update({ faith: id as WizardData["faith"] })}
                        className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                          ${selected
                            ? "border-brand-green bg-brand-mint"
                            : "border-border/60 bg-white hover:border-brand-green/40 hover:bg-brand-mint/30"
                          }`}
                      >
                        <span className="text-3xl" aria-hidden="true">{emoji}</span>
                        <span className={`text-sm font-medium text-center leading-tight ${selected ? "text-brand-green-deep" : "text-foreground"}`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {data.faith && data.faith !== "SECULAR" && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={data.faithIntegration}
                    onClick={() => update({ faithIntegration: !data.faithIntegration })}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2
                      ${data.faithIntegration
                        ? "border-brand-green bg-brand-mint"
                        : "border-border/60 bg-white hover:border-brand-green/40"
                      }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${data.faithIntegration ? "border-brand-green bg-brand-green" : "border-muted-foreground/40"}`}
                    >
                      {data.faithIntegration && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-green-deep">
                        Integrate faith values into lessons
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Stories, references, and activities aligned with your beliefs
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* ── Step 4: Location ── */}
            {step === 4 && (
              <div className="p-5 sm:p-8 space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                    Where are you based?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    We use this to suggest local day out ideas — museums, parks, and places to explore near you.
                  </p>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="onboarding-location" className="text-sm font-medium text-brand-green-deep block mb-1.5">
                    Your town or city
                  </label>
                  <div className="relative">
                    <MapPin aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="onboarding-location"
                      type="text"
                      value={data.location}
                      onChange={(e) => update({ location: e.target.value })}
                      placeholder="e.g. Manchester, Leeds, Bristol"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Children Profiles ── */}
            {step === 5 && (
              <div className="p-5 sm:p-8 space-y-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 id="children-heading" className="font-display text-2xl font-bold text-brand-green-deep">
                      Tell us about your children
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We personalize lessons around each child&apos;s age, interests, and learning style.
                    </p>
                  </div>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                {/* Children Tabs / Switcher */}
                <div
                  role="tablist"
                  aria-label="Children profiles"
                  className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
                >
                  {data.children.map((child, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      id={`child-tab-${idx}`}
                      aria-controls={`child-panel-${idx}`}
                      aria-selected={activeChildIndex === idx}
                      onClick={() => setActiveChildIndex(idx)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green
                        ${activeChildIndex === idx
                          ? "bg-brand-green text-white border-brand-green shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/50"
                        }`}
                    >
                      <User aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>{child.name.trim() || `Child #${idx + 1}`}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    aria-label="Add another child"
                    onClick={addChild}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-dashed border-brand-green text-brand-green hover:bg-brand-mint/40 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                  >
                    <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Add child</span>
                  </button>
                </div>

                {/* Active Child Form */}
                {data.children[activeChildIndex] && (
                  <div
                    role="tabpanel"
                    id={`child-panel-${activeChildIndex}`}
                    aria-labelledby={`child-tab-${activeChildIndex}`}
                    className="bg-brand-mint/20 rounded-2xl p-4 sm:p-5 border border-brand-green/20 space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-green-deep flex items-center gap-1.5">
                        <Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-brand-green" />
                        Child #{activeChildIndex + 1} Profile
                      </span>
                      {data.children.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove child #${activeChildIndex + 1}${data.children[activeChildIndex].name ? ` (${data.children[activeChildIndex].name})` : ""}`}
                          onClick={() => removeChild(activeChildIndex)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg p-1"
                        >
                          <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Child Name */}
                    <div>
                      <label htmlFor={`child-name-${activeChildIndex}`} className="text-xs font-medium text-brand-green-deep block mb-1">
                        Child&apos;s first name
                      </label>
                      <input
                        id={`child-name-${activeChildIndex}`}
                        type="text"
                        value={data.children[activeChildIndex].name}
                        onChange={(e) => updateChild(activeChildIndex, { name: e.target.value })}
                        placeholder="e.g. Leo"
                        className="w-full h-10 px-3.5 rounded-xl border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Child Age */}
                    <div>
                      <span id={`child-age-label-${activeChildIndex}`} className="text-xs font-medium text-brand-green-deep block mb-1">
                        Age
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`Decrease age for ${data.children[activeChildIndex].name || `Child #${activeChildIndex + 1}`}`}
                          onClick={() =>
                            updateChild(activeChildIndex, {
                              age: Math.max(4, data.children[activeChildIndex].age - 1),
                            })
                          }
                          disabled={data.children[activeChildIndex].age <= 4}
                          className="w-9 h-9 rounded-xl border border-input bg-white flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                        >
                          <Minus aria-hidden="true" className="w-4 h-4" />
                        </button>
                        <span aria-live="polite" className="text-sm font-bold text-brand-green-deep w-24 text-center">
                          {data.children[activeChildIndex].age} years old
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase age for ${data.children[activeChildIndex].name || `Child #${activeChildIndex + 1}`}`}
                          onClick={() =>
                            updateChild(activeChildIndex, {
                              age: Math.min(11, data.children[activeChildIndex].age + 1),
                            })
                          }
                          disabled={data.children[activeChildIndex].age >= 11}
                          className="w-9 h-9 rounded-xl border border-input bg-white flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                        >
                          <Plus aria-hidden="true" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Interests */}
                    <div>
                      <span id={`child-interests-label-${activeChildIndex}`} className="text-xs font-medium text-brand-green-deep block mb-1.5">
                        Interests & hobbies
                      </span>
                      <div role="group" aria-labelledby={`child-interests-label-${activeChildIndex}`} className="grid grid-cols-3 gap-2">
                        {INTERESTS.map(({ id, label, emoji }) => {
                          const selected = data.children[activeChildIndex].interests.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleChildInterest(activeChildIndex, id)}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green
                                ${selected
                                  ? "border-brand-green bg-white text-brand-green-deep font-semibold shadow-xs"
                                  : "border-border/50 bg-white/70 text-muted-foreground hover:border-brand-green/40 hover:bg-white"
                                }`}
                            >
                              <span aria-hidden="true" className="text-base leading-none">{emoji}</span>
                              <span className="text-xs truncate">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Learning Style */}
                    <div>
                      <span id={`child-style-label-${activeChildIndex}`} className="text-xs font-medium text-brand-green-deep block mb-1.5">
                        Learning style
                      </span>
                      <div role="radiogroup" aria-labelledby={`child-style-label-${activeChildIndex}`} className="grid grid-cols-3 gap-2">
                        {LEARNING_STYLES.map(({ id, label, emoji, description }) => {
                          const selected = data.children[activeChildIndex].learningStyle === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => updateChild(activeChildIndex, { learningStyle: id })}
                              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green
                                ${selected
                                  ? "border-brand-green bg-white text-brand-green-deep font-semibold shadow-xs"
                                  : "border-border/50 bg-white/70 text-muted-foreground hover:border-brand-green/40 hover:bg-white"
                                }`}
                            >
                              <span aria-hidden="true" className="text-xl mb-1">{emoji}</span>
                              <div>
                                <p className="text-xs font-semibold leading-tight">{label}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                                  {description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add another child button */}
                <button
                  type="button"
                  onClick={addChild}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-green/50 text-brand-green font-semibold text-sm hover:bg-brand-mint/30 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                >
                  <Plus aria-hidden="true" className="w-4 h-4" />
                  Add another child
                </button>
              </div>
            )}

            {/* ── Navigation footer (steps 1–5) ── */}
            <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => goToStep(step - 1)}
                  className="flex items-center gap-1.5 px-4 h-11 rounded-xl border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                >
                  <ChevronLeft aria-hidden="true" className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Dedicated Equal-Sized Side-by-Side Cards ── */}
        {step === 6 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Card: Account creation form */}
            <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 sm:p-8 flex flex-col justify-between">
              <form onSubmit={handleFinalSubmit} className="flex flex-col h-full justify-between space-y-6">
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                      Create your account & save
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Save your custom setup and launch your family dashboard immediately.
                    </p>
                  </div>

                  {error && (
                    <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="account-name" className="text-sm font-medium text-brand-green-deep block mb-1.5">
                        Your name
                      </label>
                      <input
                        id="account-name"
                        type="text"
                        autoComplete="name"
                        value={data.name}
                        onChange={(e) => update({ name: e.target.value })}
                        placeholder="Sarah"
                        required
                        className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label htmlFor="account-email" className="text-sm font-medium text-brand-green-deep block mb-1.5">
                        Email address
                      </label>
                      <input
                        id="account-email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => update({ email: e.target.value })}
                        placeholder="you@example.com"
                        required
                        className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label htmlFor="account-password" className="text-sm font-medium text-brand-green-deep block mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="account-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={data.password}
                          onChange={(e) => update({ password: e.target.value })}
                          placeholder="At least 8 characters"
                          required
                          minLength={8}
                          className="w-full h-11 px-4 pr-11 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          aria-controls="account-password"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded p-1"
                        >
                          {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => goToStep(5)}
                    className="flex items-center gap-1.5 px-4 h-12 rounded-xl border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                  >
                    <ChevronLeft aria-hidden="true" className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                  >
                    {loading && <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />}
                    Save setup & open dashboard
                  </button>
                </div>
              </form>
            </div>

            {/* Right Card: Dedicated AI Lesson Preview */}
            <div className="bg-gradient-to-br from-brand-mint/40 via-white to-brand-mint/20 rounded-3xl border border-brand-green/30 shadow-sm p-6 sm:p-8 flex flex-col justify-between space-y-5">
              {/* Header & Subject Selector */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0" aria-hidden="true">
                      <Sparkles className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-green-deep leading-tight">
                        AI Lesson Preview
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Personalised for {primaryChild.name.trim() || "your child"} (Age {primaryChild.age})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchPreview(previewSubject)}
                    disabled={previewLoading}
                    aria-label="Regenerate sample lesson"
                    title="Regenerate sample lesson"
                    className="p-2 rounded-xl text-brand-green hover:bg-brand-mint/70 border border-brand-green/30 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green shrink-0 shadow-2xs"
                  >
                    <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Subject Selector Tabs */}
                <div role="tablist" aria-label="Sample lesson subjects" className="flex items-center gap-1.5 flex-wrap">
                  {PREVIEW_SUBJECTS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      role="tab"
                      aria-selected={previewSubject === subj}
                      onClick={() => {
                        setPreviewSubject(subj);
                        fetchPreview(subj);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green
                        ${previewSubject === subj
                          ? "bg-brand-green text-white border-brand-green shadow-xs"
                          : "bg-white text-muted-foreground hover:bg-brand-mint/30 hover:text-brand-green-deep border-border/60"
                        }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body: Preview Content or Shimmer */}
              <div className="flex-1 flex flex-col justify-center">
                {previewLoading ? (
                  <div aria-live="polite" className="py-6 space-y-4 animate-pulse">
                    <div className="flex items-center gap-2 text-xs font-medium text-brand-green">
                      <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-brand-green" />
                      <span>Crafting custom {previewSubject} preview for {primaryChild.name || "your child"}...</span>
                    </div>
                    <div className="bg-white/90 p-4 rounded-2xl border border-brand-green/20 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-16 bg-brand-green/20 rounded-md" />
                        <div className="h-5 w-40 bg-muted/60 rounded-md" />
                      </div>
                      <div className="h-3 w-full bg-muted/40 rounded" />
                      <div className="h-3 w-3/4 bg-muted/40 rounded" />
                      <div className="h-16 w-full bg-brand-mint/30 rounded-xl mt-2" />
                    </div>
                  </div>
                ) : previewLesson ? (
                  <div className="space-y-3 text-xs">
                    {/* Lesson Header & Objective */}
                    <div className="bg-white/95 p-3.5 rounded-2xl border border-brand-green/20 shadow-2xs space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-brand-green text-white text-[10px] font-bold">
                          {previewLesson.subject}
                        </span>
                        <span className="font-bold text-brand-green-deep text-xs sm:text-sm truncate">
                          {previewLesson.topic}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {previewLesson.headline || previewLesson.learningObjective}
                      </p>
                    </div>

                    {/* Tailored Activity Box */}
                    <div className="bg-white/95 p-3.5 rounded-2xl border border-brand-green/20 shadow-2xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-brand-green-deep">
                        <Lightbulb aria-hidden="true" className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {previewLesson.tailoredActivity?.badge || "Tailored Activity"}
                        </span>
                      </div>
                      {previewLesson.tailoredActivity?.title && (
                        <p className="font-semibold text-brand-green-deep text-xs">
                          {previewLesson.tailoredActivity.title}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
                        {previewLesson.tailoredActivity?.instructions}
                      </p>
                    </div>

                    {/* Trip / Local suggestion */}
                    {previewLesson.localDayOut && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-brand-green/15 flex items-start gap-2 text-[11px]">
                        <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-brand-green-deep">Trip idea: </span>
                          <span className="text-muted-foreground">{previewLesson.localDayOut.venue} — {previewLesson.localDayOut.idea}</span>
                        </div>
                      </div>
                    )}

                    {/* Faith reflection snippet if present */}
                    {previewLesson.faithReflection && (
                      <div className="bg-brand-mint/40 p-2.5 rounded-xl border border-brand-green/20 flex items-start gap-2 text-[11px]">
                        <BookOpen aria-hidden="true" className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                        <p className="text-brand-green-deep italic">
                          &ldquo;{previewLesson.faithReflection}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/90 p-6 rounded-2xl border border-brand-green/20 text-center space-y-2">
                    <Sparkles aria-hidden="true" className="w-6 h-6 text-brand-green mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Select a subject tab above to craft your child&apos;s tailored lesson preview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}
