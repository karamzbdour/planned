import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, tierAtLeast } from "@/lib/subscription";
import { checkAndAwardBadges, BADGE_DEFS } from "@/lib/bloom";

export const dynamic = "force-dynamic";

const JOURNAL_PAYWALL = {
  error: "Journal is a Basic feature. Upgrade to Basic to record entries.",
  paywall: true,
  requiredTier: "BASIC" as const,
};

// ── GET /api/journal?childId= ──────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(JOURNAL_PAYWALL, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await db.journalEntry.findMany({
    where: { childId },
    orderBy: { entryDate: "desc" },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEntries = entries.length;
  const withPhotos   = entries.filter((e) => e.hasPhoto).length;
  const dayTrips     = entries.filter((e) => e.moment === "DAY_OUT").length;
  const totalMinutes = entries.reduce((sum, e) => sum + (((e as unknown as { durationMins?: number | null }).durationMins) ?? 0), 0);

  const weekSet = new Set(
    entries.map((e) => {
      const d = new Date(e.entryDate);
      // ISO week key: YYYY-WW
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const week = Math.ceil(
        ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
      );
      return `${d.getFullYear()}-${week}`;
    })
  );
  const weeksCovered = weekSet.size;

  return NextResponse.json({
    child: { id: child.id, name: child.name, yearGroup: child.yearGroup },
    stats: { totalEntries, withPhotos, dayTrips, weeksCovered, totalMinutes },
    entries: entries.map((e) => ({
      id: e.id,
      lessonId: e.lessonId,
      title: e.title,
      notes: e.notes,
      subject: e.subject,
      moment: e.moment,
      hasPhoto: e.hasPhoto,
      photoUrl: e.photoUrl,
      durationMins: ((e as unknown as { durationMins?: number | null }).durationMins) ?? null,
      tags: JSON.parse(e.tags || "[]") as string[],
      entryDate: e.entryDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

// ── POST /api/journal ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(JOURNAL_PAYWALL, { status: 403 });
  }

  const body = await req.json();
  const {
    childId,
    notes,
    subject,
    title,
    moment = "REGULAR",
    lessonId,
    photoUrl,
    durationMins,
    tags = [],
    entryDate,
  } = body;

  if (!childId || !notes?.trim()) {
    return NextResponse.json(
      { error: "childId and notes are required" },
      { status: 400 }
    );
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsedDuration =
    typeof durationMins === "number" && !isNaN(durationMins) && durationMins > 0
      ? Math.round(durationMins)
      : durationMins
      ? Math.max(parseInt(String(durationMins), 10) || 0, 0)
      : null;

  // Auto-generate title if not provided
  const resolvedTitle =
    title?.trim() ||
    (subject ? `${subject} — ${new Date(entryDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : `Journal entry — ${new Date(entryDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`);

  const entry = await (db.journalEntry.create as unknown as (args: { data: Record<string, unknown> }) => Promise<typeof db.journalEntry extends { create: (args: any) => Promise<infer R> } ? R : any>)({
    data: {
      childId,
      lessonId: lessonId ?? null,
      title: resolvedTitle,
      notes: notes.trim(),
      subject: subject ?? null,
      moment,
      hasPhoto: !!photoUrl,
      photoUrl: photoUrl ?? null,
      durationMins: parsedDuration,
      tags: JSON.stringify(tags),
      entryDate: entryDate ? new Date(entryDate) : new Date(),
    },
  });

  // Sync to subject progress if subject & duration provided
  if (subject && parsedDuration && parsedDuration > 0) {
    await db.progress.upsert({
      where: { childId_subject: { childId, subject } },
      update: {
        totalMinutes: { increment: parsedDuration },
      },
      create: {
        childId,
        subject,
        topicsCompleted: 0,
        topicsTotal: 1,
        objectivesMet: 0,
        totalMinutes: parsedDuration,
      },
    });
  }

  // Award Bloom Stars: 1 base star, +1 extra if photo evidence provided
  const starsGained = photoUrl ? 2 : 1;
  const updatedChild = await db.child.update({
    where: { id: childId },
    data: { bloomStars: { increment: starsGained } },
  });

  // Check for newly unlocked badges (e.g. JOURNAL_FIRST, PHOTO_JOURNALIST, FIELD_EXPLORER, PROLIFIC_AUTHOR, DAY_TRIPPER)
  const newBadgeTypes = await checkAndAwardBadges(childId);
  const newBadges = BADGE_DEFS.filter((b) => newBadgeTypes.includes(b.type));

  return NextResponse.json(
    {
      entry: {
        ...entry,
        tags: JSON.parse(entry.tags || "[]") as string[],
      },
      starsGained,
      totalStars: updatedChild.bloomStars,
      newBadges,
      newBadgeTypes,
    },
    { status: 201 }
  );
}

