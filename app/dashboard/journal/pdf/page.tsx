"use client";

import { useEffect, useState, useCallback } from "react";
import { useActiveChild } from "@/contexts/active-child";
import { useSetBreadcrumbTitle } from "@/contexts/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useSession } from "next-auth/react";
import { Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/paywall/upgrade-prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  title: string;
  notes: string;
  subject: string | null;
  moment: string;
  hasPhoto: boolean;
  photoUrl: string | null;
  durationMins?: number | null;
  tags: string[];
  entryDate: string;
}

interface JournalData {
  child: { id: string; name: string; yearGroup: string | null };
  stats: { totalEntries: number };
  entries: JournalEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_PRINT_COLOR: Record<string, string> = {
  mathematics:          "#1C4E75",
  maths:                "#1C4E75",
  english:              "#6B2856",
  literacy:             "#6B2856",
  science:              "#1F5C38",
  history:              "#7B4E12",
  geography:            "#1B5760",
  art:                  "#8E3B20",
  music:                "#4B296D",
  "religious studies":  "#273F7A",
  "islamic studies":    "#273F7A",
  pe:                   "#8A4810",
  computing:            "#1B5760",
  "day out":            "#7B4E12",
};

function subjectColor(subject: string | null): string {
  return SUBJECT_PRINT_COLOR[(subject ?? "").toLowerCase()] ?? "#2B5F75";
}

const MOMENT_LABEL: Record<string, string> = {
  REGULAR:      "Lesson",
  BREAKTHROUGH: "Breakthrough!",
  DAY_OUT:      "Day out",
  CREATIVE:     "Creative",
  SPECIAL:      "Special memory",
};

function dateRange(entries: JournalEntry[]): string {
  if (!entries.length) return "";
  const sorted = [...entries].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  const first = new Date(sorted[0].entryDate).toLocaleDateString("en-GB", {
    month: "short", year: "numeric",
  });
  const last = new Date(sorted[sorted.length - 1].entryDate).toLocaleDateString("en-GB", {
    month: "short", year: "numeric",
  });
  return first === last ? first : `${first} – ${last}`;
}

// ─── Print styles injected into <head> ───────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body { background: white !important; }
  .no-print { display: none !important; }
  .print-page { padding: 0 !important; max-width: 100% !important; }
  .print-grid { grid-template-columns: 1fr 1fr !important; }
  .journal-card { break-inside: avoid; page-break-inside: avoid; }
  @page { margin: 1.5cm; size: A4; }
}
`;

// ─── PDF Entry Card ───────────────────────────────────────────────────────────

function PDFCard({ entry }: { entry: JournalEntry }) {
  const color = subjectColor(entry.subject);
  const label = MOMENT_LABEL[entry.moment] ?? "Lesson";
  const date  = new Date(entry.entryDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div
      className="journal-card rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: `${color}30` }}
    >
      {/* Coloured top bar */}
      <div className="h-2" style={{ backgroundColor: color }} />

      {/* Photo */}
      {entry.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.photoUrl}
          alt={entry.title}
          className="w-full h-32 object-cover"
        />
      )}

      <div className="px-4 py-3 space-y-2">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {entry.subject && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {entry.subject}
              </span>
            )}
            <span className="text-[10px] text-gray-500">{label}</span>
            {entry.durationMins && entry.durationMins > 0 ? (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 font-medium px-1.5 py-0.2 rounded">
                {entry.durationMins}m
              </span>
            ) : null}
          </div>
          <span className="text-[10px] text-gray-400">{date}</span>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-sm text-[#182848] leading-snug">
          {entry.title}
        </h3>

        {/* Notes */}
        <p
          className="text-xs text-gray-600 leading-relaxed"
          style={{
            fontFamily: "Georgia, serif",
            display: "-webkit-box",
            WebkitLineClamp: 5,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {entry.notes}
        </p>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.tags.map((t) => (
              <span key={t} className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
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

export default function JournalPDFPage() {
  const { activeChild } = useActiveChild();
  const { data: session } = useSession();
  useSetBreadcrumbTitle("PDF Keepsake");
  const [data, setData]       = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(false);

  // Check tier via /api/user/me
  const [tier, setTier] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setTier(d.user?.subscriptionTier ?? "FREE"))
      .catch(() => setTier("FREE"));
  }, [session]);

  const fetchData = useCallback(async (childId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal?childId=${childId}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChild?.id) fetchData(activeChild.id);
  }, [activeChild?.id, fetchData]);

  // Paywall: PDF export is Premium only
  if (tier !== null && tier !== "PREMIUM") {
    return (
      <div className="px-5 py-12 max-w-lg mx-auto">
        <Link href="/dashboard/journal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-green mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to journal
        </Link>
        <UpgradePrompt
          requiredTier="PREMIUM"
          feature="PDF Journal Keepsake"
          description="Export your child's full journal as a beautiful print-ready PDF — available on the Premium plan."
        />
      </div>
    );
  }

  if (!activeChild || loading || !data || tier === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-sm text-muted-foreground">Preparing keepsake…</span>
      </div>
    );
  }

  const { child, entries } = data;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  const range = dateRange(entries);

  return (
    <>
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      {/* Screen navigation — hidden in print */}
      <div className="no-print px-5 py-4 flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/dashboard/journal"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
            title="Back to journal"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Breadcrumbs className="py-0 flex-1 min-w-0" />
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-4 py-2 rounded-xl transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* ── Print-ready journal content ──────────────────────────────────── */}
      <div className="print-page px-8 py-8 max-w-4xl mx-auto">
        {/* Journal header */}
        <div className="text-center mb-8">
          <div
            className="inline-block w-full py-7 px-4 rounded-3xl mb-2 border border-[#EAE3D2] shadow-2xs"
            style={{ background: "linear-gradient(135deg, #EFF4F6 0%, #FAF6ED 100%)" }}
          >
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-brand-green-deep tracking-tight">
              {child.name}&apos;s Homeschool Journal
            </h1>
            {child.yearGroup && (
              <p className="text-brand-green-deep/80 text-sm font-medium mt-1">
                Year {child.yearGroup}
              </p>
            )}
            {range && (
              <p className="text-[#5A6E78] text-xs mt-0.5 font-medium">{range}</p>
            )}
          </div>
        </div>

        {/* Entries grid */}
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No journal entries yet.</p>
        ) : (
          <div className="print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sorted.map((entry) => (
              <PDFCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Printed from{" "}
            <span className="font-serif font-bold text-brand-green-deep">Planned</span>
            {" "}— Home Education — {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </>
  );
}
