"use client";

import { useState, useRef } from "react";
import { X, Loader2, Camera, Tag, Sparkles, Clock, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { label: "Maths",            emoji: "🔢" },
  { label: "English",          emoji: "📖" },
  { label: "Science",          emoji: "🔬" },
  { label: "Art",              emoji: "🎨" },
  { label: "Geography",        emoji: "🗺️" },
  { label: "Islamic Studies",  emoji: "🌙" },
  { label: "PE",               emoji: "⚽" },
  { label: "Day out",          emoji: "🚗" },
  { label: "History",          emoji: "🏺" },
  { label: "Music",            emoji: "🎵" },
  { label: "Computing",        emoji: "💻" },
  { label: "Other",            emoji: "📝" },
];

const MOMENTS = [
  { value: "REGULAR",     label: "Regular lesson",   emoji: "📚" },
  { value: "BREAKTHROUGH", label: "Breakthrough!",    emoji: "✨" },
  { value: "DAY_OUT",     label: "Day out",           emoji: "🚗" },
  { value: "CREATIVE",    label: "Creative work",     emoji: "🎨" },
  { value: "SPECIAL",     label: "Special memory",    emoji: "⭐" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddEntryModalProps {
  childId: string;
  childName: string;
  /** Pre-fill from lesson completion */
  prefill?: {
    lessonId: string;
    subject: string;
    topic: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddEntryModal({
  childId,
  childName,
  prefill,
  onClose,
  onSaved,
}: AddEntryModalProps) {
  const [notes, setNotes]                 = useState(prefill ? `Today we worked on "${prefill.topic}". ` : "");
  const [subject, setSubject]             = useState(prefill?.subject ?? "");
  const [title, setTitle]                 = useState(prefill?.topic ?? "");
  const [moment, setMoment]               = useState("REGULAR");
  const [durationMins, setDurationMins]   = useState<string>("");
  const [tagInput, setTagInput]           = useState("");
  const [tags, setTags]                   = useState<string[]>([]);
  const [entryDate, setEntryDate]         = useState(new Date().toISOString().split("T")[0]);
  const [photoUrl, setPhotoUrl]           = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzing, setAnalyzing]         = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [learningSummary, setLearningSummary] = useState<string>("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAutoAnalyze() {
    if (!notes.trim()) {
      setError("Write a short description or notes first so AI can analyze it.");
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/journal/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim(),
          childId,
          subject: subject || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "AI analysis failed");
      }

      const { analysis } = await res.json();
      if (analysis) {
        if (analysis.suggestedTitle && (!title || title.startsWith("Journal entry"))) {
          setTitle(analysis.suggestedTitle);
        }
        if (analysis.suggestedSubject && !subject) {
          const match = SUBJECTS.find(
            (s) => s.label.toLowerCase() === analysis.suggestedSubject.toLowerCase()
          );
          if (match) setSubject(match.label);
        }
        if (analysis.suggestedMoment) {
          setMoment(analysis.suggestedMoment);
        }
        if (Array.isArray(analysis.suggestedTags)) {
          const newTags = analysis.suggestedTags.map((t: string) => t.toLowerCase().trim());
          setTags((prev) => Array.from(new Set([...prev, ...newTags])));
        }
        if (analysis.estimatedDurationMins && !durationMins) {
          setDurationMins(String(analysis.estimatedDurationMins));
        }
        if (Array.isArray(analysis.keySkills)) {
          setSuggestedSkills(analysis.keySkills);
        }
        if (analysis.learningSummary) {
          setLearningSummary(analysis.learningSummary);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI analysis was unable to complete.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/journal/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoUrl(data.url);
    } catch {
      setError("Photo upload failed. You can still save without a photo.");
    } finally {
      setUploadLoading(false);
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Please add a note.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          notes: notes.trim(),
          subject: subject || undefined,
          title: title.trim() || undefined,
          moment,
          lessonId: prefill?.lessonId ?? undefined,
          photoUrl: photoUrl ?? undefined,
          durationMins: durationMins ? parseInt(durationMins, 10) : undefined,
          tags,
          entryDate,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="font-display font-bold text-brand-green-deep">
            {prefill ? `Journal note for ${childName}` : "New journal entry"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          {/* Notes — serif warm textarea + AI Auto-Analyze button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes" className="text-sm font-medium text-brand-green-deep">
                What happened? <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={handleAutoAnalyze}
                disabled={analyzing || !notes.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green hover:text-brand-green-deep disabled:opacity-50 transition-colors bg-brand-mint/60 hover:bg-brand-mint px-2.5 py-1 rounded-lg"
                title="Automatically detects subject, moment, title, tags, and curriculum skills from notes"
              >
                {analyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{analyzing ? "Analyzing…" : "Auto-Fill with AI"}</span>
              </button>
            </div>
            <textarea
              id="notes"
              rows={5}
              placeholder="Write about today's learning, discoveries, or special moments…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green placeholder:text-muted-foreground/60"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            />
          </div>

          {/* AI Curriculum Analysis Results Box */}
          {(suggestedSkills.length > 0 || learningSummary) && (
            <div className="bg-brand-mint/40 border border-brand-green/20 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-green-deep">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Curriculum Insights</span>
              </div>
              {learningSummary && (
                <p className="text-xs text-brand-green-deep/90 leading-relaxed italic bg-white/70 rounded-lg p-2 border border-brand-green/10">
                  &ldquo;{learningSummary}&rdquo;
                </p>
              )}
              {suggestedSkills.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-[11px] font-semibold text-brand-green-deep/80 uppercase tracking-wide">
                    Identified Skills & Objectives:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-white border border-brand-green/30 text-brand-green-deep px-2.5 py-1 rounded-lg font-medium shadow-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-brand-green shrink-0" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subject grid */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Subject{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSubject(subject === s.label ? "" : s.label)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all",
                    subject === s.label
                      ? "bg-brand-mint border-brand-green text-brand-green-deep font-medium"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30 hover:bg-brand-mint/20"
                  )}
                >
                  <span className="text-base shrink-0">{s.emoji}</span>
                  <span className="truncate text-xs">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Moment type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Moment type
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MOMENTS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMoment(m.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                    moment === m.value
                      ? "bg-brand-mint border-brand-green text-brand-green-deep font-medium"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30 hover:bg-brand-mint/20"
                  )}
                >
                  <span>{m.emoji}</span>
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Learning Duration (mins) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="duration" className="text-sm font-medium text-brand-green-deep flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Learning Time</span>
                <span className="text-muted-foreground font-normal text-xs">(syncs to progress)</span>
              </Label>
              {durationMins && parseInt(durationMins, 10) > 0 && (
                <span className="text-xs font-semibold text-brand-green">
                  {durationMins} mins
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMins(durationMins === String(m) ? "" : String(m))}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                    durationMins === String(m)
                      ? "bg-brand-mint border-brand-green text-brand-green-deep"
                      : "bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-brand-green/30"
                  )}
                >
                  {m}m
                </button>
              ))}
              <div className="flex-1 min-w-[110px]">
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="720"
                  placeholder="Custom mins"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Title + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium text-brand-green-deep">
                Title{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Volcano experiment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edate" className="text-sm font-medium text-brand-green-deep">
                Date
              </Label>
              <Input
                id="edate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Photo{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            {photoUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Entry photo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="w-full h-24 rounded-xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-brand-green/40 hover:bg-brand-mint/10 transition-colors disabled:opacity-50"
              >
                {uploadLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <span className="text-xs">
                  {uploadLoading ? "Uploading…" : "Tap to add a photo"}
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-brand-green-deep">
              Tags{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. outdoors, hands-on"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  if (e.key === "," || e.key === " ") { e.preventDefault(); addTag(); }
                }}
                className="rounded-xl flex-1"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-muted-foreground hover:text-brand-green hover:border-brand-green/30 transition-colors"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs bg-brand-mint text-brand-green-deep px-2 py-0.5 rounded-full"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-destructive"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bloom Star Reward Hint */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-800">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
              <span>
                {photoUrl ? "+2 Bloom Stars (with photo)" : "+1 Bloom Star (+2 with photo attached)"}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
              Bloom Garden
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-green hover:bg-brand-green-deep gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </div>
    </div>
  );
}
