"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useActiveChild } from "@/contexts/active-child";
import { AddEntryModal } from "@/components/journal/add-entry-modal";
import {
  ACTIVITY_TEMPLATES,
  ActivityTemplate,
} from "@/lib/activity-templates";
import {
  Loader2,
  Plus,
  FileText,
  LayoutGrid,
  AlignLeft,
  MapPin,
  Sparkles,
  Palette,
  Star,
  BookOpen,
  X,
  Camera,
  Tag as TagIcon,
  Trash2,
  Clock,
  Compass,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  lessonId: string | null;
  title: string;
  notes: string;
  subject: string | null;
  moment: string;
  hasPhoto: boolean;
  photoUrl: string | null;
  durationMins?: number | null;
  tags: string[];
  entryDate: string;
  createdAt: string;
}

interface JournalData {
  child: { id: string; name: string; yearGroup: string | null };
  stats: {
    totalEntries: number;
    withPhotos: number;
    dayTrips: number;
    weeksCovered: number;
    totalMinutes?: number;
  };
  entries: JournalEntry[];
}

type FilterCategory = "all" | "day_out" | "creative" | "breakthrough" | "photos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_BG: Record<string, string> = {
  mathematics: "from-blue-400 to-blue-600",
  maths:       "from-blue-400 to-blue-600",
  english:     "from-violet-400 to-violet-600",
  science:     "from-emerald-400 to-emerald-600",
  history:     "from-amber-400 to-amber-600",
  geography:   "from-teal-400 to-teal-600",
  art:         "from-pink-400 to-pink-600",
  music:       "from-purple-400 to-purple-600",
  "religious studies": "from-indigo-400 to-indigo-600",
  "islamic studies":   "from-indigo-400 to-indigo-600",
  pe:          "from-orange-400 to-orange-600",
  computing:   "from-cyan-400 to-cyan-600",
  "day out":   "from-yellow-400 to-yellow-600",
};

const SUBJECT_DOT: Record<string, string> = {
  mathematics: "bg-blue-500",
  maths:       "bg-blue-500",
  english:     "bg-violet-500",
  science:     "bg-emerald-500",
  history:     "bg-amber-500",
  geography:   "bg-teal-500",
  art:         "bg-pink-500",
  music:       "bg-purple-500",
  "religious studies": "bg-indigo-500",
  "islamic studies":   "bg-indigo-500",
  pe:          "bg-orange-500",
  computing:   "bg-cyan-500",
  "day out":   "bg-yellow-500",
};

function subjectBg(subject: string | null) {
  return SUBJECT_BG[(subject ?? "").toLowerCase()] ?? "from-brand-green to-emerald-600";
}
function subjectDot(subject: string | null) {
  return SUBJECT_DOT[(subject ?? "").toLowerCase()] ?? "bg-brand-green";
}

const MOMENT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  REGULAR:     { icon: <BookOpen className="w-3 h-3" />,  label: "Lesson",        color: "bg-slate-100 text-slate-600" },
  BREAKTHROUGH:{ icon: <Sparkles className="w-3 h-3" />,  label: "Breakthrough!", color: "bg-amber-100 text-amber-700" },
  DAY_OUT:     { icon: <MapPin className="w-3 h-3" />,    label: "Day out",       color: "bg-green-100 text-green-700" },
  CREATIVE:    { icon: <Palette className="w-3 h-3" />,   label: "Creative",      color: "bg-pink-100 text-pink-700" },
  SPECIAL:     { icon: <Star className="w-3 h-3" />,      label: "Special",       color: "bg-purple-100 text-purple-700" },
};

function momentMeta(moment: string) {
  return MOMENT_META[moment] ?? MOMENT_META["REGULAR"];
}

function isFeatured(entry: JournalEntry) {
  return entry.moment === "DAY_OUT" || entry.moment === "BREAKTHROUGH" || entry.hasPhoto;
}

function formatEntryDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function weekLabel(isoStr: string) {
  const d = new Date(isoStr);
  const week = getISOWeek(d);
  // Find Monday of this week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `Week ${week} — ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

// ─── Entry Viewer Modal ────────────────────────────────────────────────────────

function EntryViewerModal({
  entry,
  onClose,
  onDelete,
}: {
  entry: JournalEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const meta = momentMeta(entry.moment);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this journal entry? This can't be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/journal/${entry.id}`, { method: "DELETE" });
      onDelete(entry.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Photo or colour header */}
        {entry.photoUrl ? (
          <div className="relative w-full h-48 sm:rounded-t-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.photoUrl} alt={entry.title} className="w-full h-full object-cover" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div className={cn("w-full h-20 bg-gradient-to-br sm:rounded-t-2xl", subjectBg(entry.subject))} />
        )}

        <div className="px-5 py-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {entry.subject && (
                  <span className={cn("w-2 h-2 rounded-full shrink-0", subjectDot(entry.subject))} />
                )}
                {entry.subject && (
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {entry.subject}
                  </span>
                )}
                <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", meta.color)}>
                  {meta.icon}
                  {meta.label}
                </span>
                {entry.durationMins && entry.durationMins > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-mint text-brand-green-deep font-medium">
                    <Clock className="w-3 h-3" />
                    {entry.durationMins}m
                  </span>
                ) : null}
              </div>
              <h2 className="font-display font-bold text-brand-green-deep text-lg leading-snug">
                {entry.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatEntryDate(entry.entryDate)}
              </p>
            </div>
            {!entry.photoUrl && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Notes */}
          <p
            className="text-[15px] leading-relaxed text-brand-green-deep/80 whitespace-pre-wrap"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {entry.notes}
          </p>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <span key={t} className="text-xs bg-brand-mint text-brand-green-deep px-2 py-0.5 rounded-full font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:opacity-50 mt-2"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scrapbook card ────────────────────────────────────────────────────────────

function ScrapbookCard({
  entry,
  onClick,
}: {
  entry: JournalEntry;
  onClick: () => void;
}) {
  const featured = isFeatured(entry);
  const meta = momentMeta(entry.moment);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden cursor-pointer hover:shadow-md hover:border-brand-green/30 transition-all break-inside-avoid mb-3 group",
        featured && "col-span-2"
      )}
    >
      {/* Photo or colour area */}
      {entry.photoUrl ? (
        <div className={cn("w-full overflow-hidden", featured ? "h-48" : "h-28")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.photoUrl}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className={cn("w-full bg-gradient-to-br", subjectBg(entry.subject), featured ? "h-28" : "h-14")} />
      )}

      {/* Content */}
      <div className="px-3 py-3 space-y-2">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.subject && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              {entry.subject}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", meta.color)}>
            {meta.icon}
            {meta.label}
          </span>
          {entry.durationMins && entry.durationMins > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-mint text-brand-green-deep font-medium shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {entry.durationMins}m
            </span>
          ) : null}
          {entry.hasPhoto && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
              <Camera className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        <h3 className="font-semibold text-sm text-brand-green-deep leading-snug">
          {entry.title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {entry.notes}
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{formatEntryDate(entry.entryDate)}</p>
          {entry.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <TagIcon className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {entry.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({
  entry,
  onClick,
}: {
  entry: JournalEntry;
  onClick: () => void;
}) {
  const meta = momentMeta(entry.moment);
  const d = new Date(entry.entryDate);
  const dayName = d.toLocaleDateString("en-GB", { weekday: "short" });
  const dayNum  = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="flex gap-4 cursor-pointer group"
    >
      {/* Day column */}
      <div className="w-12 shrink-0 text-right pt-0.5">
        <p className="text-xs font-semibold text-muted-foreground">{dayName}</p>
        <p className="text-xs text-muted-foreground">{dayNum}</p>
      </div>

      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-2.5 h-2.5 rounded-full mt-1 shrink-0", subjectDot(entry.subject))} />
        <div className="w-px flex-1 bg-[hsl(var(--border))] mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 group-hover:opacity-80 transition-opacity">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {entry.subject && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate max-w-[100px]">
              {entry.subject}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium", meta.color)}>
            {meta.icon}
            {meta.label}
          </span>
          {entry.durationMins && entry.durationMins > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-mint text-brand-green-deep font-medium">
              <Clock className="w-2.5 h-2.5" />
              {entry.durationMins}m
            </span>
          ) : null}
          {entry.hasPhoto && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              <Camera className="w-2.5 h-2.5" />
              Photo
            </span>
          )}
        </div>

        <p className="font-semibold text-sm text-brand-green-deep">{entry.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.notes}</p>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-brand-mint text-brand-green-deep px-1.5 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = "scrapbook" | "timeline";

export default function JournalPage() {
  const { activeChild } = useActiveChild();
  const [data, setData]                       = useState<JournalData | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [view, setView]                       = useState<ViewMode>("scrapbook");
  const [showAdd, setShowAdd]                 = useState(false);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>(undefined);
  const [viewing, setViewing]                 = useState<JournalEntry | null>(null);
  const [paywalled, setPaywalled]             = useState(false);
  const [filterCategory, setFilterCategory]   = useState<FilterCategory>("all");

  const fetchData = useCallback(async (childId: string) => {
    setLoading(true);
    setPaywalled(false);
    try {
      const res = await fetch(`/api/journal?childId=${childId}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.paywall) setPaywalled(true);
        return;
      }
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChild?.id) fetchData(activeChild.id);
  }, [activeChild?.id, fetchData]);

  function handleDelete(id: string) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.filter((e) => e.id !== id),
            stats: {
              ...prev.stats,
              totalEntries: prev.stats.totalEntries - 1,
            },
          }
        : prev
    );
  }

  function handleOpenWithTemplate(templateId?: string) {
    setInitialTemplateId(templateId);
    setShowAdd(true);
  }

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries.filter((entry) => {
      if (filterCategory === "day_out") return entry.moment === "DAY_OUT";
      if (filterCategory === "creative") return entry.moment === "CREATIVE";
      if (filterCategory === "breakthrough") return entry.moment === "BREAKTHROUGH";
      if (filterCategory === "photos") return entry.hasPhoto;
      return true;
    });
  }, [data?.entries, filterCategory]);

  // Timeline grouping for filtered entries
  const groupedTimeline = useMemo(() => {
    const groups: { weekKey: string; label: string; entries: JournalEntry[] }[] = [];
    for (const entry of filteredEntries) {
      const d = new Date(entry.entryDate);
      const weekKey = `${d.getFullYear()}-${String(getISOWeek(d)).padStart(2, "0")}`;
      const existing = groups.find((g) => g.weekKey === weekKey);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.push({ weekKey, label: weekLabel(entry.entryDate), entries: [entry] });
      }
    }
    return groups;
  }, [filteredEntries]);

  if (paywalled) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-brand-green" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Journal is a Basic feature
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Capture moments, photos, and milestones from your homeschool
            journey. Upgrade to Basic to start journalling — cancel any time.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          See plans
        </Link>
      </div>
    );
  }

  if (!activeChild || loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Loading journal…</span>
      </div>
    );
  }

  const { child, stats, entries } = data;

  return (
    <>
      {showAdd && activeChild && (
        <AddEntryModal
          childId={activeChild.id}
          childName={child.name}
          initialTemplateId={initialTemplateId}
          onClose={() => {
            setShowAdd(false);
            setInitialTemplateId(undefined);
          }}
          onSaved={() => fetchData(activeChild.id)}
        />
      )}
      {viewing && (
        <EntryViewerModal
          entry={viewing}
          onClose={() => setViewing(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-brand-green-deep">
              Journal & Activities
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio of {child.name}&apos;s real-world learning and milestones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/journal/pdf"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground border border-[hsl(var(--border))] bg-white hover:bg-muted/50 px-3 py-2 rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF keepsake
            </Link>
            <button
              onClick={() => handleOpenWithTemplate(undefined)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-3.5 py-2 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add entry
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: stats.totalEntries,  label: "entries" },
            { value: stats.withPhotos,    label: "with photos" },
            { value: stats.dayTrips,      label: "day trips" },
            { value: stats.weeksCovered,  label: "weeks" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-[hsl(var(--border))] px-3 py-3 text-center"
            >
              <p className="font-display font-bold text-xl text-brand-green-deep leading-none">
                {s.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Log Real-World Activity Tray ────────────────────────────── */}
        <div className="bg-gradient-to-br from-brand-mint/60 via-brand-mint/30 to-white p-4 rounded-2xl border border-brand-green/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-deep flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-green" />
              <span>Quick Log Real-World Learning</span>
            </p>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Pre-filled duration & tags
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {ACTIVITY_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleOpenWithTemplate(tmpl.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-brand-green/25 hover:border-brand-green hover:shadow-xs text-xs font-medium text-brand-green-deep transition-all shrink-0 group"
              >
                <span className="group-hover:scale-110 transition-transform">
                  {tmpl.emoji}
                </span>
                <span>{tmpl.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filter Bar & View Toggle ──────────────────────────────────────── */}
        {entries.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Category filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: "all", label: `All (${entries.length})` },
                  { id: "day_out", label: "🚗 Day Trips" },
                  { id: "creative", label: "🎨 Creative" },
                  { id: "breakthrough", label: "✨ Breakthroughs" },
                  { id: "photos", label: "📸 Photos" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-xl border transition-all shrink-0 font-medium",
                    filterCategory === f.id
                      ? "bg-brand-green text-white border-brand-green shadow-xs"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:text-brand-green-deep hover:border-brand-green/30"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="inline-flex bg-muted rounded-xl p-1 gap-1 shrink-0">
              <button
                onClick={() => setView("scrapbook")}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all",
                  view === "scrapbook"
                    ? "bg-white text-brand-green-deep shadow-sm"
                    : "text-muted-foreground hover:text-brand-green-deep"
                )}
              >
                <LayoutGrid className="w-3 h-3" />
                Scrapbook
              </button>
              <button
                onClick={() => setView("timeline")}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all",
                  view === "timeline"
                    ? "bg-white text-brand-green-deep shadow-sm"
                    : "text-muted-foreground hover:text-brand-green-deep"
                )}
              >
                <AlignLeft className="w-3 h-3" />
                Timeline
              </button>
            </div>
          </div>
        )}

        {/* Empty state (no entries at all) */}
        {entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-12 text-center">
            <p className="text-3xl mb-3">📓</p>
            <p className="font-semibold text-brand-green-deep">
              No journal entries yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Record memories, breakthroughs, practical life skills, and day trips as you go.
            </p>
            <button
              onClick={() => handleOpenWithTemplate(undefined)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-4 py-2.5 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Write first entry
            </button>
          </div>
        )}

        {/* Empty filter result state */}
        {entries.length > 0 && filteredEntries.length === 0 && (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-8 text-center">
            <p className="text-xl mb-2">🔍</p>
            <p className="font-semibold text-sm text-brand-green-deep">
              No entries match this filter
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Try switching back to &apos;All&apos; or log an activity with this category.
            </p>
            <button
              onClick={() => setFilterCategory("all")}
              className="text-xs font-semibold text-brand-green hover:underline"
            >
              Show all entries
            </button>
          </div>
        )}

        {/* ── Scrapbook view ──────────────────────────────────────────────── */}
        {view === "scrapbook" && filteredEntries.length > 0 && (
          <div className="columns-1 sm:columns-2 gap-3">
            {filteredEntries.map((entry) => (
              <ScrapbookCard
                key={entry.id}
                entry={entry}
                onClick={() => setViewing(entry)}
              />
            ))}
          </div>
        )}

        {/* ── Timeline view ───────────────────────────────────────────────── */}
        {view === "timeline" && filteredEntries.length > 0 && (
          <div className="space-y-6">
            {groupedTimeline.map((group) => (
              <div key={group.weekKey}>
                <h2 className="font-display font-semibold text-sm text-muted-foreground mb-3">
                  {group.label}
                </h2>
                <div className="space-y-0">
                  {group.entries.map((entry) => (
                    <TimelineEntry
                      key={entry.id}
                      entry={entry}
                      onClick={() => setViewing(entry)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </>
  );
}
