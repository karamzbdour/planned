import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, tierAtLeast } from "@/lib/subscription";
import { analyzeJournalEntry } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(
      { error: "Journal AI analysis is available on Basic and higher tiers.", paywall: true },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { notes, childId, subject } = body;

  if (!notes || typeof notes !== "string" || !notes.trim()) {
    return NextResponse.json({ error: "notes is required" }, { status: 400 });
  }

  let childName = "Student";
  let yearGroup: string | undefined;

  if (childId) {
    const child = await db.child.findFirst({
      where: { id: childId, userId: session.user.id },
      select: { name: true, yearGroup: true },
    });
    if (child) {
      childName = child.name;
      yearGroup = child.yearGroup ?? undefined;
    }
  }

  try {
    const analysis = await analyzeJournalEntry({
      notes: notes.trim(),
      childName,
      yearGroup,
      currentSubject: subject,
    });

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    console.error("AI journal analysis failed:", err);
    return NextResponse.json(
      { error: "Failed to analyze journal notes. Please try again or fill fields manually." },
      { status: 500 }
    );
  }
}
