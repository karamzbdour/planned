"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { useSetBreadcrumbTitle } from "@/contexts/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  Loader2,
  ArrowLeft,
  Star,
  Trash2,
  Gift,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveReward {
  id: string;
  name: string;
  starsRequired: number;
  starsRemaining: number;
  ready: boolean;
}

interface RedeemedReward {
  id: string;
  name: string;
  starsRequired: number;
  redeemedAt: string | null;
}

interface SettingsData {
  child: { id: string; name: string };
  stars: number;
  activeRewards: ActiveReward[];
  redeemedRewards: RedeemedReward[];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BloomSettingsPage() {
  const { activeChild } = useActiveChild();
  useSetBreadcrumbTitle("Reward Settings");
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);

  // Add reward form
  const [rewardName, setRewardName] = useState("");
  const [rewardStars, setRewardStars] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Per-row action states
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(async (childId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bloom?childId=${childId}`);
      if (res.ok) {
        const json = await res.json();
        setData({
          child: json.child,
          stars: json.stars,
          activeRewards: json.activeRewards,
          redeemedRewards: json.redeemedRewards,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChild?.id) fetchData(activeChild.id);
  }, [activeChild?.id, fetchData]);

  async function handleAddReward(e: React.FormEvent) {
    e.preventDefault();
    if (!rewardName.trim() || !rewardStars) {
      setAddError("Name and stars target are required.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/bloom/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: activeChild!.id,
          name: rewardName.trim(),
          starsRequired: parseInt(rewardStars, 10),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to add reward");
      }
      setRewardName("");
      setRewardStars("");
      await fetchData(activeChild!.id);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRedeem(rewardId: string) {
    setRedeemingId(rewardId);
    try {
      await fetch(`/api/bloom/rewards/${rewardId}`, { method: "POST" });
      await fetchData(activeChild!.id);
    } finally {
      setRedeemingId(null);
    }
  }

  async function handleRemove(rewardId: string) {
    setRemovingId(rewardId);
    try {
      await fetch(`/api/bloom/rewards/${rewardId}`, { method: "DELETE" });
      await fetchData(activeChild!.id);
    } finally {
      setRemovingId(null);
    }
  }

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const { child, stars, activeRewards, redeemedRewards } = data;

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
      {/* Breadcrumbs */}
      <Breadcrumbs className="-mb-2" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/bloom"
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          title="Back to Bloom"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-brand-green-deep">
            Reward settings
          </h1>
          <p className="text-xs text-muted-foreground">
            {child.name} has{" "}
            <span className="font-semibold text-amber-600">
              {stars} ⭐
            </span>
          </p>
        </div>
      </div>

      {/* Active rewards */}
      <div className="space-y-2">
        <h2 className="font-display font-semibold text-brand-green-deep">
          Active rewards
        </h2>

        {activeRewards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-2xl mb-2">🎁</p>
            <p className="text-sm text-muted-foreground">No active rewards yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add one below to motivate {child.name}!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {activeRewards.map((r) => (
              <div key={r.id} className="px-4 py-3.5 space-y-2">
                {/* Name + actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-sm text-brand-green-deep truncate">
                      {r.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.ready && (
                      <button
                        onClick={() => handleRedeem(r.id)}
                        disabled={redeemingId === r.id}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {redeemingId === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Give reward
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(r.id)}
                      disabled={removingId === r.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
                      aria-label="Remove reward"
                    >
                      {removingId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {stars} / {r.starsRequired} stars
                    </span>
                    {r.ready ? (
                      <span className="text-brand-green font-semibold">
                        Ready to claim! 🎉
                      </span>
                    ) : (
                      <span>{r.starsRemaining} to go</span>
                    )}
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        r.ready ? "bg-brand-green" : "bg-amber-400"
                      )}
                      style={{
                        width: `${Math.min(
                          (stars / r.starsRequired) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add reward form */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5 space-y-4">
        <h2 className="font-display font-semibold text-brand-green-deep">
          Add custom reward
        </h2>
        <form onSubmit={handleAddReward} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rname" className="text-sm font-medium text-brand-green-deep">
              Reward name
            </Label>
            <Input
              id="rname"
              placeholder="e.g. Trip to the cinema"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rstars" className="text-sm font-medium text-brand-green-deep">
              Stars target
            </Label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 fill-amber-400 pointer-events-none" />
              <Input
                id="rstars"
                type="number"
                min={1}
                max={9999}
                placeholder="e.g. 50"
                value={rewardStars}
                onChange={(e) => setRewardStars(e.target.value)}
                className="rounded-xl pl-9"
              />
            </div>
          </div>

          {addError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
              {addError}
            </p>
          )}

          <Button
            type="submit"
            disabled={addLoading}
            className="w-full bg-brand-green hover:bg-brand-green-deep gap-2"
          >
            {addLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {addLoading ? "Adding…" : "Add reward"}
          </Button>
        </form>
      </div>

      {/* Redeemed history */}
      {redeemedRewards.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand-green-deep">
            Redeemed rewards
          </h2>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
            {redeemedRewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                  <span className="text-sm font-medium text-brand-green-deep truncate">
                    {r.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {r.starsRequired} ⭐
                  </p>
                  {r.redeemedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.redeemedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
