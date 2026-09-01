import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrichVideoResources } from "@/lib/youtube";
import type { VideoResource } from "@/lib/lessonGenerator";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    include: {
      objectives: { orderBy: { id: "asc" } },
      child: {
        select: {
          id: true,
          name: true,
          age: true,
          yearGroup: true,
          learningStyle: true,
          bloomStars: true,
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  let parsedContent: Record<string, unknown> = {};
  try {
    parsedContent = JSON.parse(lesson.generatedContent);
  } catch {
    // empty
  }

  if (
    Array.isArray(parsedContent.videoResources) &&
    parsedContent.videoResources.length > 0
  ) {
    const rawVideos = parsedContent.videoResources as VideoResource[];
    const needsEnrichment = rawVideos.some((v) => !v.youtubeId);
    if (needsEnrichment) {
      try {
        const enriched = await enrichVideoResources(rawVideos);
        parsedContent.videoResources = enriched;
        // Background cache update
        db.lesson
          .update({
            where: { id: lesson.id },
            data: { generatedContent: JSON.stringify(parsedContent) },
          })
          .catch((err) =>
            console.error("[GET /api/lessons/[id]] DB update error:", err)
          );
      } catch (err) {
        console.error("[GET /api/lessons/[id]] Enrich error:", err);
      }
    }
  }

  return NextResponse.json({ lesson, parsedContent });
}

