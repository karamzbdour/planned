"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { CircularProgress } from "@/components/progress/circular-progress";
import { LogActivityModal } from "@/components/progress/log-activity-modal";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Plus,
  BookCheck,
  Target,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectRow {
  subject: string;
  topicsCompleted: number;
  topicsTotal: number;
  topicsInProgress: number;
  objectivesMet: number;
  totalMinutes: number;
  abilityLevel: string;
  isManualOverride?: boolean;
}

interface ActivityItem {
  id: string;
  type: "LESSON" | "EXTERNAL";
  subject: string;
  title: string;
  completedAt: string | null;
  objectivesDone: number;
  objectivesTotal: number;
  durationMins: number;
  isExternal: boolean;
}

interface ProgressData {
  child: { id: string; name: string; yearGroup: string | null };
  overallStats: {
    lessonsCompleted: number;
    objectivesMet: number;
    objectivesTotal: number;
    totalMinutes: number;
    curriculumPercent: number;
  };
  termInfo: { week: number; term: string; totalWeeks: number };
  subjects: SubjectRow[];
  recentActivity: ActivityItem[];
}

interface ObjectiveChip {
  id: string;
  text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_DOTS: Record<string, string> = {
  mathematics: "bg-blue-500",
  maths: "bg-blue-500",
  english: "bg-violet-500",
  science: "bg-emerald-500",
  history: "bg-amber-500",
  geography: "bg-teal-500",
  art: "bg-pink-500",
  music: "bg-purple-500",
  "religious studies": "bg-indigo-500",
  pe: "bg-orange-500",
  computing: "bg-cyan-500",
};

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#3b82f6",
  maths: "#3b82f6",
  english: "#8b5cf6",
  science: "#10b981",
  history: "#f59e0b",
  geography: "#14b8a6",
  art: "#ec4899",
  music: "#a855f7",
  "religious studies": "#6366f1",
  pe: "#f97316",
  computing: "#06b6d4",
};

const ABILITY_STYLES: Record<string, string> = {
  EMERGING: "bg-amber-100 text-amber-700",
  DEVELOPING: "bg-blue-100 text-blue-700",
  SECURE: "bg-emerald-100 text-emerald-700",
  EXCEEDING: "bg-purple-100 text-purple-700",
};

function subjectDot(subject: string) {
  return SUBJECT_DOTS[subject.toLowerCase()] ?? "bg-brand-green";
}

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? "#1D9E75";
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function slugify(subject: string) {
  return encodeURIComponent(subject.toLowerCase());
}

// ─── Animated subject bar ─────────────────────────────────────────────────────

function SubjectBar({ row, animate }: { row: SubjectRow; animate: boolean }) {
  const pct = row.topicsTotal > 0 ? Math.round((row.topicsCompleted / row.topicsTotal) * 100) : 0;
  const abilityStyle = ABILITY_STYLES[row.abilityLevel] ?? "bg-muted text-muted-foreground";

  return (
    <Link
      href={`/dashboard/progress/${encodeURIComponent(row.subject)}`}
      className="group flex flex-col gap-2 bg-white rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5 hover:border-brand-green/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", subjectDot(row.subject))} />
          <span className="font-medium text-sm text-brand-green-deep truncate">
            {row.subject}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", abilityStyle)}>
            {row.abilityLevel.charAt(0) + row.abilityLevel.slice(1).toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {row.topicsCompleted}/{row.topicsTotal}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-green transition-colors" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pct}% complete</span>
          {row.topicsInProgress > 0 && (
            <span className="text-amber-600">{row.topicsInProgress} in progress</span>
          )}
        </div>
        {/* Animated bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animate ? `${pct}%` : "0%",
              backgroundColor: subjectColor(row.subject),
            }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { activeChild } = useActiveChild();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [objectives, setObjectives] = useState<ObjectiveChip[]>([]);

  const fetchData = useCallback(async (childId: string) => {
    setLoading(true);
    setAnimate(false);
    try {
      const res = await fetch(`/api/progress?childId=${childId}`);
      if (res.ok) {
        const json: ProgressData = await res.json();
        setData(json);
        // Fetch objectives for log activity modal
        const objRes = await fetch(`/api/lessons/objectives?childId=${childId}`).catch(() => null);
        if (objRes?.ok) {
          const objData = await objRes.json();
          setObjectives(objData.objectives ?? []);
        }
        // Trigger bar animations after data loads
        requestAnimationFrame(() => setTimeout(() => setAnimate(true), 50));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChild?.id) fetchData(activeChild.id);
  }, [activeChild?.id, fetchData]);

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading progress…</span>
      </div>
    );
  }

  const { overallStats: stats, termInfo, subjects, recentActivity } = data;

  return (
    <>
      {showModal && (
        <LogActivityModal
          childId={activeChild.id}
          objectives={objectives}
          onClose={() => setShowModal(false)}
          onSaved={() => fetchData(activeChild.id)}
        />
      )}

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-brand-green-deep">
            Progress
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log activity
          </button>
        </div>

        {/* Overview card */}
        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-5">
          <div className="flex items-center gap-5">
            <CircularProgress percent={stats.curriculumPercent} size={100} strokeWidth={9}>
              <span className="font-display font-bold text-xl text-brand-green-deep leading-none">
                {stats.curriculumPercent}%
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">covered</span>
            </CircularProgress>

            <div className="flex-1 space-y-3">
              {[
                {
                  icon: <BookCheck className="w-3.5 h-3.5" />,
                  value: stats.lessonsCompleted,
                  label: "lessons done",
                },
                {
                  icon: <Target className="w-3.5 h-3.5" />,
                  value: `${stats.objectivesMet}${stats.objectivesTotal > 0 ? `/${stats.objectivesTotal}` : ""}`,
                  label: "objectives met",
                },
                {
                  icon: <Clock className="w-3.5 h-3.5" />,
                  value:
                    stats.totalMinutes >= 60
                      ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                      : `${stats.totalMinutes}m`,
                  label: "learning time",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-brand-green">{s.icon}</span>
                  <span className="font-semibold text-sm text-brand-green-deep">
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Term progress bar */}
          <div className="mt-5 pt-4 border-t border-[hsl(var(--border))]">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium text-brand-green-deep">
                {termInfo.term} Term
              </span>
              <span>
                Week {termInfo.week} of {termInfo.totalWeeks}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all duration-700 ease-out"
                style={{
                  width: animate
                    ? `${Math.min((termInfo.week / termInfo.totalWeeks) * 100, 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Subjects */}
        {subjects.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-brand-green-deep">
              Subjects
            </h2>
            <div className="space-y-2">
              {subjects.map((row) => (
                <SubjectBar key={row.subject} row={row} animate={animate} />
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-brand-green-deep">
              Recent activity
            </h2>
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3.5"
                >
                  <span
                    className={cn(
                      "mt-1 w-2.5 h-2.5 rounded-full shrink-0",
                      subjectDot(item.subject)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-brand-green-deep truncate">
                        {item.title}
                      </p>
                      {item.isExternal && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0 inline-flex items-center gap-0.5">
                          <ExternalLink className="w-2.5 h-2.5" /> External
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {item.subject}
                      </span>
                      {item.objectivesTotal > 0 && (
                        <span className="text-xs text-brand-green font-medium">
                          ✓ {item.objectivesDone}/{item.objectivesTotal}
                        </span>
                      )}
                      {item.durationMins > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {item.durationMins} min
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.completedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subjects.length === 0 && recentActivity.length === 0 && (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-10 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-semibold text-brand-green-deep">No progress yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete lessons or log activities to see progress here.
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </>
  );
}
