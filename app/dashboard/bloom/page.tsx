"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { Loader2, Settings, Star, X, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BloomLevel { label: string; minStars: number; emoji: string }

interface ActiveReward {
  id: string; name: string; starsRequired: number;
  starsRemaining: number; ready: boolean;
}

interface Badge {
  type: string; label: string; description: string; emoji: string;
  earned: boolean; earnedAt: string | null;
}

interface GardenEl {
  id: string; stars: number; label: string; unlocked: boolean;
}

interface BloomData {
  child: { id: string; name: string };
  stars: number;
  level: BloomLevel;
  nextLevel: BloomLevel | null;
  activeRewards: ActiveReward[];
  badges: Badge[];
  gardenElements: GardenEl[];
  /** True when the user's tier doesn't include the full garden (FREE). */
  gardenLocked?: boolean;
}

// ─── Garden SVG ───────────────────────────────────────────────────────────────

function GardenSVG({ elements, name }: { elements: GardenEl[]; name: string }) {
  const unlocked = (id: string) => elements.find((e) => e.id === id)?.unlocked ?? false;

  return (
    <svg
      viewBox="0 0 360 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full rounded-2xl"
      aria-label={`${name}'s garden`}
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2F0EC" />
          <stop offset="100%" stopColor="#F5F9F6" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="360" height="160" fill="url(#skyGrad)" />
      {/* Grass strip */}
      <rect y="155" width="360" height="45" fill="#DEEFE4" />
      {/* Horizon hill */}
      <ellipse cx="180" cy="158" rx="220" ry="20" fill="#BEDDC9" />

      {/* ── Sun (50 stars) ── */}
      <g style={{ opacity: unlocked("sun") ? 1 : 0, transition: "opacity 1s" }}>
        <circle cx="310" cy="38" r="22" fill="#FDE68A" />
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <line key={i}
            x1={310 + 26 * Math.cos(a * Math.PI / 180)}
            y1={38 + 26 * Math.sin(a * Math.PI / 180)}
            x2={310 + 34 * Math.cos(a * Math.PI / 180)}
            y2={38 + 34 * Math.sin(a * Math.PI / 180)}
            stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round"
          />
        ))}
      </g>

      {/* ── Cloud (100 stars) ── */}
      <g style={{ opacity: unlocked("cloud") ? 1 : 0, transition: "opacity 1s" }}>
        <ellipse cx="95" cy="30" rx="30" ry="16" fill="white" />
        <ellipse cx="75" cy="36" rx="20" ry="13" fill="white" />
        <ellipse cx="115" cy="36" rx="22" ry="13" fill="white" />
      </g>

      {/* ── Rainbow (220 stars) ── */}
      <g style={{ opacity: unlocked("rainbow") ? 1 : 0, transition: "opacity 1s" }}>
        {[
          { r: 130, color: "#EF4444" },
          { r: 120, color: "#F97316" },
          { r: 110, color: "#EAB308" },
          { r: 100, color: "#22C55E" },
          { r: 90,  color: "#3B82F6" },
          { r: 80,  color: "#8B5CF6" },
        ].map(({ r, color }) => (
          <path
            key={r}
            d={`M ${180 - r} 140 A ${r} ${r} 0 0 1 ${180 + r} 140`}
            fill="none" stroke={color} strokeWidth="8" strokeOpacity="0.7"
          />
        ))}
      </g>

      {/* ── Pond (175 stars) ── */}
      <g style={{ opacity: unlocked("pond") ? 1 : 0, transition: "opacity 1s" }}>
        <ellipse cx="270" cy="166" rx="38" ry="12" fill="#7DD3FC" />
        <ellipse cx="270" cy="163" rx="38" ry="10" fill="#BAE6FD" fillOpacity="0.6" />
        <ellipse cx="262" cy="164" rx="6" ry="4" fill="#4ADE80" />
        <ellipse cx="278" cy="167" rx="5" ry="3.5" fill="#4ADE80" />
      </g>

      {/* ── Tall tree (150 stars) ── */}
      <g style={{ opacity: unlocked("tall_tree") ? 1 : 0, transition: "opacity 1s" }}>
        <rect x="324" y="128" width="8" height="32" rx="3" fill="#92400E" />
        <polygon points="328,65 310,110 346,110" fill="#166534" />
        <polygon points="328,80 307,122 349,122" fill="#15803D" />
        <polygon points="328,95 305,132 351,132" fill="#16A34A" />
      </g>

      {/* ── First tree (75 stars) ── */}
      <g style={{ opacity: unlocked("first_tree") ? 1 : 0, transition: "opacity 1s" }}>
        <rect x="32" y="138" width="7" height="24" rx="3" fill="#92400E" />
        <circle cx="35" cy="118" r="22" fill="#16A34A" />
        <circle cx="22" cy="128" r="16" fill="#15803D" />
        <circle cx="48" cy="126" r="15" fill="#166534" />
      </g>

      {/* ── Grass tufts (60 stars) ── */}
      <g style={{ opacity: unlocked("grass_tufts") ? 1 : 0, transition: "opacity 1s" }}>
        {[100,155,210,265].map((x) => (
          <g key={x}>
            <line x1={x} y1="158" x2={x - 4} y2="148" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
            <line x1={x} y1="158" x2={x}     y2="146" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
            <line x1={x} y1="158" x2={x + 4} y2="148" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* ── Sprout (10 stars) ── */}
      <g style={{ opacity: unlocked("sprout") ? 1 : 0, transition: "opacity 1s" }}>
        <line x1="180" y1="175" x2="180" y2="155" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="175" cy="160" rx="7" ry="4" fill="#86EFAC" transform="rotate(-30 175 160)" />
        <ellipse cx="185" cy="157" rx="7" ry="4" fill="#4ADE80" transform="rotate(30 185 157)" />
      </g>

      {/* ── Purple flower (25 stars) ── */}
      <g style={{ opacity: unlocked("purple_flower") ? 1 : 0, transition: "opacity 1s" }}>
        <line x1="130" y1="175" x2="130" y2="158" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
        {[0,72,144,216,288].map((a,i) => (
          <ellipse key={i} cx={130 + 8 * Math.cos(a*Math.PI/180)} cy={155 + 8 * Math.sin(a*Math.PI/180)}
            rx="5" ry="3.5" fill="#C084FC"
            transform={`rotate(${a} ${130 + 8*Math.cos(a*Math.PI/180)} ${155 + 8*Math.sin(a*Math.PI/180)})`}
          />
        ))}
        <circle cx="130" cy="155" r="4" fill="#FDE68A" />
      </g>

      {/* ── Pink flower (40 stars) ── */}
      <g style={{ opacity: unlocked("pink_flower") ? 1 : 0, transition: "opacity 1s" }}>
        <line x1="220" y1="175" x2="220" y2="158" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
        {[0,72,144,216,288].map((a,i) => (
          <ellipse key={i} cx={220 + 8 * Math.cos(a*Math.PI/180)} cy={155 + 8 * Math.sin(a*Math.PI/180)}
            rx="5" ry="3.5" fill="#F9A8D4"
            transform={`rotate(${a} ${220 + 8*Math.cos(a*Math.PI/180)} ${155 + 8*Math.sin(a*Math.PI/180)})`}
          />
        ))}
        <circle cx="220" cy="155" r="4" fill="#FDE68A" />
      </g>

      {/* ── Teal flower (90 stars) ── */}
      <g style={{ opacity: unlocked("teal_flower") ? 1 : 0, transition: "opacity 1s" }}>
        <line x1="80" y1="175" x2="80" y2="158" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
        {[0,72,144,216,288].map((a,i) => (
          <ellipse key={i} cx={80 + 8 * Math.cos(a*Math.PI/180)} cy={155 + 8 * Math.sin(a*Math.PI/180)}
            rx="5" ry="3.5" fill="#2DD4BF"
            transform={`rotate(${a} ${80 + 8*Math.cos(a*Math.PI/180)} ${155 + 8*Math.sin(a*Math.PI/180)})`}
          />
        ))}
        <circle cx="80" cy="155" r="4" fill="#FDE68A" />
      </g>

      {/* ── Golden flower (110 stars) ── */}
      <g style={{ opacity: unlocked("golden_flower") ? 1 : 0, transition: "opacity 1s" }}>
        <line x1="165" y1="175" x2="165" y2="158" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <ellipse key={i} cx={165 + 9 * Math.cos(a*Math.PI/180)} cy={155 + 9 * Math.sin(a*Math.PI/180)}
            rx="5" ry="3" fill="#FCD34D"
            transform={`rotate(${a} ${165 + 9*Math.cos(a*Math.PI/180)} ${155 + 9*Math.sin(a*Math.PI/180)})`}
          />
        ))}
        <circle cx="165" cy="155" r="4.5" fill="#F59E0B" />
      </g>

      {/* ── Bird (125 stars) ── */}
      <g style={{ opacity: unlocked("bird") ? 1 : 0, transition: "opacity 1s" }}>
        <path d="M 60 62 Q 65 58 70 62" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M 70 62 Q 75 58 80 62" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>

      {/* ── Butterfly (128 stars) ── */}
      <g style={{ opacity: unlocked("butterfly") ? 1 : 0, transition: "opacity 1s" }}>
        <ellipse cx="248" cy="88" rx="10" ry="7" fill="#F9A8D4" fillOpacity="0.85" transform="rotate(-30 248 88)" />
        <ellipse cx="262" cy="88" rx="10" ry="7" fill="#F9A8D4" fillOpacity="0.85" transform="rotate(30 262 88)" />
        <ellipse cx="248" cy="96" rx="7" ry="5" fill="#EC4899" fillOpacity="0.7" transform="rotate(20 248 96)" />
        <ellipse cx="262" cy="96" rx="7" ry="5" fill="#EC4899" fillOpacity="0.7" transform="rotate(-20 262 96)" />
        <line x1="255" y1="86" x2="255" y2="100" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M 255 86 Q 252 82 249 80" stroke="#6B7280" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M 255 86 Q 258 82 261 80" stroke="#6B7280" strokeWidth="1" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// ─── Star counter ──────────────────────────────────────────────────────────────

function StarCounter({ stars }: { stars: number }) {
  return (
    <div className="relative inline-flex items-center justify-center w-28 h-28 shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FDF6E7] to-[#F5E5C6] shadow-sm ring-1 ring-[#C98A2C]/30 border border-[#E8CE98]" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="60" cy="60" r="50" fill="none" stroke="#C98A2C" strokeWidth="1.5" strokeDasharray="3 3.5" opacity="0.5" />
      </svg>
      <div className="relative flex flex-col items-center z-10">
        <Star className="w-6 h-6 text-[#C98A2C] fill-[#C98A2C] drop-shadow-2xs" />
        <span className="font-serif font-bold text-3xl text-[#182848] leading-none mt-1">
          {stars}
        </span>
        <span className="text-[10px] text-[#8C5D14] font-semibold tracking-wider uppercase mt-0.5">stars</span>
      </div>
    </div>
  );
}

// ─── New-element banner ────────────────────────────────────────────────────────

function NewElementBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#FDF9F0] border border-[#EED9B8] rounded-2xl px-4 py-3 shadow-2xs">
      <span className="text-sm font-serif font-medium text-[#7B4E12]">✨ {message}</span>
      <button
        onClick={onDismiss}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#FAF3E8] transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5 text-[#8A5E1E]" />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BloomPage() {
  const { activeChild } = useActiveChild();
  const [data, setData] = useState<BloomData | null>(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [prevStars, setPrevStars] = useState<number | null>(null);

  const fetchData = useCallback(
    async (childId: string, currentPrev: number | null) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/bloom?childId=${childId}`);
        if (res.ok) {
          const json: BloomData = await res.json();

          // Detect newly unlocked garden element
          if (currentPrev !== null && json.stars > currentPrev) {
            const newEl = json.gardenElements.find(
              (el) => el.unlocked && el.stars > currentPrev && el.stars <= json.stars
            );
            if (newEl) {
              setBanner(`${newEl.label} in ${json.child.name}'s garden!`);
            }
          }

          setPrevStars(json.stars);
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeChild?.id) fetchData(activeChild.id, prevStars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.id]);

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const { child, stars, level, nextLevel, activeRewards, badges, gardenElements, gardenLocked } = data;

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-brand-green-deep tracking-tight">
          Bloom 🌱
        </h1>
        <Link
          href="/dashboard/bloom/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand-green transition-colors"
        >
          <Settings className="w-4 h-4" />
          Rewards
        </Link>
      </div>

      {/* Banner */}
      {banner && (
        <NewElementBanner message={banner} onDismiss={() => setBanner(null)} />
      )}

      {/* Hero: star counter + level */}
      <div className="bg-white rounded-3xl border border-[#EAE3D2] px-5 py-6 flex items-center gap-5 shadow-2xs">
        <StarCounter stars={stars} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#546477] font-medium uppercase tracking-wider">
            Keep going, {child.name}!
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xl">{level.emoji}</span>
            <span className="font-serif font-bold text-brand-green-deep text-lg sm:text-xl">
              {level.label}
            </span>
          </div>
          {nextLevel && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{nextLevel.label} at {nextLevel.minStars} ⭐</span>
                <span className="font-semibold text-[#8C5D14]">{Math.max(nextLevel.minStars - stars, 0)} to go</span>
              </div>
              <div className="h-2 bg-[#F2EDE2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#E5B25D] to-[#C98A2C] rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(
                      ((stars - level.minStars) /
                        (nextLevel.minStars - level.minStars)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Garden — Basic+ feature. FREE users see an upgrade card instead. */}
      {gardenLocked ? (
        <div className="rounded-2xl border-2 border-dashed border-brand-green/30 bg-brand-mint/30 px-5 py-6 text-center space-y-3">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Lock className="w-5 h-5 text-brand-green" />
          </div>
          <div className="space-y-1">
            <p className="font-serif font-bold text-lg text-brand-green-deep">
              Unlock {child.name}&apos;s Bloom garden
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Watch the garden grow with sprouts, flowers, trees, and rainbows
              as {child.name} earns stars. Plus reward goals and badges to celebrate
              every milestone.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to Basic
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="font-serif font-bold text-lg text-brand-green-deep">
            {child.name}&apos;s garden
          </h2>
          <div className="rounded-2xl overflow-hidden border border-[#EAE3D2] shadow-2xs">
            <GardenSVG elements={gardenElements} name={child.name} />
          </div>
          <p className="text-xs text-center text-[#546477] font-medium">
            More garden elements unlock as you earn stars ✨
          </p>
        </div>
      )}

      {/* Reward goals — only for Basic+ */}
      {!gardenLocked && activeRewards.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-serif font-bold text-lg text-brand-green-deep">
            Reward goals
          </h2>
          <div className="bg-white rounded-2xl border border-[#EAE3D2] divide-y divide-[#EAE3D2] shadow-2xs overflow-hidden">
            {activeRewards.map((r) => (
              <div key={r.id} className="px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-[#182848] truncate">
                    {r.name}
                  </span>
                  {r.ready ? (
                    <span className="text-xs font-serif font-bold px-2.5 py-0.5 rounded-full bg-[#2B5F75] text-white shrink-0 shadow-2xs">
                      Ready to claim! 🎉
                    </span>
                  ) : (
                    <span className="text-xs text-[#546477] font-medium shrink-0">
                      {r.starsRemaining} ⭐ to go
                    </span>
                  )}
                </div>
                <div className="h-2 bg-[#F2EDE2] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      r.ready ? "bg-[#2B5F75]" : "bg-gradient-to-r from-[#E5B25D] to-[#C98A2C]"
                    )}
                    style={{
                      width: `${Math.min((stars / r.starsRequired) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>{stars} stars</span>
                  <span>{r.starsRequired} stars needed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No rewards yet nudge — only for Basic+ */}
      {!gardenLocked && activeRewards.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#EAE3D2] px-5 py-6 text-center shadow-2xs">
          <p className="text-2xl mb-2">🎁</p>
          <p className="font-serif font-bold text-brand-green-deep text-base">No reward goals yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Set a reward goal to motivate {child.name}!
          </p>
          <Link
            href="/dashboard/bloom/settings"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-4 py-2 rounded-xl transition-colors shadow-2xs"
          >
            Add a reward
          </Link>
        </div>
      )}

      {/* Badges — only for Basic+ */}
      {!gardenLocked && (
      <div className="space-y-2">
        <h2 className="font-serif font-bold text-lg text-brand-green-deep">
          Badges
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {/* Earned first */}
          {earnedBadges.map((b) => (
            <div
              key={b.type}
              className="bg-gradient-to-b from-white to-[#FDFBF7] rounded-2xl border border-[#EAE3D2] p-3.5 flex flex-col items-center gap-1 text-center shadow-2xs hover:shadow-xs transition-all relative ring-1 ring-[#C98A2C]/25"
            >
              <div className="w-11 h-11 rounded-full bg-[#FDF6E7] border border-[#E9CE98] flex items-center justify-center text-2xl shadow-inner mb-0.5">
                {b.emoji}
              </div>
              <span className="font-serif font-bold text-xs text-[#182848] leading-tight">
                {b.label}
              </span>
              {b.earnedAt && (
                <span className="text-[10px] text-[#546477] font-medium">
                  {new Date(b.earnedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>
          ))}

          {/* Locked */}
          {lockedBadges.map((b) => (
            <div
              key={b.type}
              className="bg-[#FAF6ED]/60 rounded-2xl border border-dashed border-[#EAE3D2] p-3.5 flex flex-col items-center gap-1 text-center opacity-65"
            >
              <div className="w-11 h-11 rounded-full bg-muted/40 flex items-center justify-center text-2xl grayscale opacity-40 mb-0.5">
                {b.emoji}
              </div>
              <span className="font-medium text-xs text-muted-foreground leading-tight">
                {b.label}
              </span>
              <span className="text-[10px] text-muted-foreground/80 leading-tight">
                {b.description}
              </span>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="h-4" />
    </div>
  );
}
