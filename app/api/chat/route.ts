import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { toTextStream, createTextStreamResponse } from "ai";
import { streamWithFallback } from "@/lib/ai/fallback";
import { getUserTier } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const CHAT_PAYWALL = {
  error: "AI chat is a Premium feature. Upgrade to Premium to ask questions about lessons.",
  paywall: true,
  requiredTier: "PREMIUM" as const,
};

// Per-tier hourly cap. PREMIUM is the only tier with access today; we keep
// FREE/BASIC entries here so a future tier change is one line in stripe.ts
// rather than a paywall-bypass.
const CHAT_LIMITS = {
  FREE:    { limit: 0,  windowMs: 60 * 60 * 1000 },
  BASIC:   { limit: 0,  windowMs: 60 * 60 * 1000 },
  PREMIUM: { limit: 60, windowMs: 60 * 60 * 1000 },
} as const;

interface SafeChild {
  name: string;
  age: number | null;
  yearGroup: string | null;
  learningStyle: string | null;
  interests: string[];
}

interface LessonContext {
  childName: string;
  subject: string;
  topic: string;
  title: string;
  description: string;
  objectives: string[];
}

function safeParseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

/**
 * Build the system prompt for the parent-facing chatbot. Gives the model the
 * curriculum / faith / children context and optionally lesson context so the parent doesn't have to
 * re-explain it every message.
 */
function systemPrompt(args: {
  curriculum: string;
  faith: string;
  faithIntegration: boolean;
  children: SafeChild[];
  lesson?: LessonContext | null;
}): string {
  const curriculumLabel: Record<string, string> = {
    BNC: "British National Curriculum",
    MONTESSORI: "Montessori",
    UNSCHOOLING: "Unschooling / Child-led",
  };
  const faithLine =
    args.faith !== "SECULAR" && args.faithIntegration
      ? `Faith: ${args.faith} — weave in naturally where the parent asks for it.`
      : `Faith: secular — keep responses non-religious unless the parent specifically asks otherwise.`;

  const childrenSummary = args.children.length
    ? args.children
        .map((c) => {
          const bits = [
            c.name,
            c.age ? `age ${c.age}` : null,
            c.yearGroup,
            c.learningStyle ? `${c.learningStyle} learner` : null,
            c.interests.length ? `interests: ${c.interests.join(", ")}` : null,
          ].filter(Boolean);
          return `  - ${bits.join(", ")}`;
        })
        .join("\n")
    : "  (no children added yet)";

  // When the parent opened chat from a specific lesson, paste the lesson plan
  // into the system prompt so the assistant can answer concretely without
  // the parent having to copy-paste it.
  const lessonBlock = args.lesson
    ? `

CURRENT LESSON THE PARENT IS LOOKING AT (treat questions as being about THIS lesson unless they say otherwise):
- Child: ${args.lesson.childName}
- Subject: ${args.lesson.subject}
- Topic: ${args.lesson.topic}
- Title: ${args.lesson.title}
- Description: ${args.lesson.description}
- Objectives:
${args.lesson.objectives.map((o) => `    • ${o}`).join("\n")}`
    : "";

  return `You are a friendly, expert UK homeschool teaching assistant helping a busy homeschool parent.

PARENT'S CONTEXT:
- Curriculum approach: ${curriculumLabel[args.curriculum] ?? args.curriculum}
- ${faithLine}
- Children:
${childrenSummary}${lessonBlock}

RESPONSE GUIDELINES:
- **Strictly concise & punchy**: Homeschooling parents are often reading while teaching. Get straight to the point in 1–2 short paragraphs or 3–4 bullet points maximum, unless the parent explicitly asks for an in-depth breakdown.
- **No filler or pleasantries**: Never include conversational preamble ("Certainly!", "Great question!", "Homeschooling can be challenging...") or closing sign-offs ("Hope this helps!", "Let me know if you need anything else!"). Begin immediately with the answer.
- **Actionable over theoretical**: Provide practical steps, hands-on examples, or direct analogies rather than general background theory.
- **UK terminology**: Use British educational terms naturally (Year groups, KS1/KS2, Maths, primary/secondary).
- **Honesty**: Never invent scripture, hadith, or citations. If uncertain, state so plainly in one sentence.`;
}

async function getOrCreateConversation(userId: string) {
  const existing = await db.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (existing) return existing;
  return db.conversation.create({
    data: { userId },
    include: { messages: true },
  });
}

/**
 * GET /api/chat
 * Loads the parent's most recent conversation + messages. Creates one
 * lazily on first call so the UI never has to handle a 404.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (tier !== "PREMIUM") {
    return NextResponse.json(CHAT_PAYWALL, { status: 403 });
  }

  const conversation = await getOrCreateConversation(session.user.id);
  return NextResponse.json({
    id: conversation.id,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/chat
 * Body: { content: string }
 * Appends a user message, calls the AI, and appends the assistant reply.
 * Returns the freshly created user message and assistant message.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (tier !== "PREMIUM") {
    return NextResponse.json(CHAT_PAYWALL, { status: 403 });
  }

  const { limit, windowMs } = CHAT_LIMITS[tier];
  const rl = rateLimit(`chat:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `You've hit your hourly chat limit. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let userContent: string;
  let lessonId: string | undefined;
  try {
    const body = await req.json();
    userContent = typeof body?.content === "string" ? body.content.trim() : "";
    lessonId = typeof body?.lessonId === "string" ? body.lessonId : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!userContent) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  if (userContent.length > 4000) {
    return NextResponse.json({ error: "Message too long (max 4000 characters)" }, { status: 400 });
  }

  // Build context for the system prompt
  const [conversation, familyProfile, children, lesson] = await Promise.all([
    getOrCreateConversation(session.user.id),
    db.familyProfile.findUnique({ where: { userId: session.user.id } }),
    db.child.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    }),
    // Only fetch the lesson when the caller asked us to scope to one. We
    // still verify it belongs to a child this user owns so a malicious
    // lessonId can't leak someone else's plan.
    lessonId
      ? db.lesson.findFirst({
          where: { id: lessonId, child: { userId: session.user.id } },
          include: { child: true, objectives: true },
        })
      : Promise.resolve(null),
  ]);

  const lessonForPrompt: LessonContext | null = lesson
    ? (() => {
        const parsed = safeParseJson<{ title?: string; description?: string }>(
          lesson.generatedContent,
          {},
        );
        return {
          childName: lesson.child.name,
          subject: lesson.subject,
          topic: lesson.topic,
          title: parsed.title ?? lesson.topic,
          description: parsed.description ?? "",
          objectives: lesson.objectives.map((o) => o.text),
        };
      })()
    : null;

  const sysPrompt = systemPrompt({
    curriculum: familyProfile?.curriculum ?? "BNC",
    faith: familyProfile?.faith ?? "SECULAR",
    faithIntegration: familyProfile?.faithIntegration ?? false,
    children: children.map((c) => ({
      name: c.name,
      age: c.age,
      yearGroup: c.yearGroup,
      learningStyle: c.learningStyle,
      interests: safeParseJson<string[]>(c.interests, []),
    })),
    lesson: lessonForPrompt,
  });

  // Persist the user message first so it survives even if the AI call fails.
  const userMessage = await db.chatMessage.create({
    data: { conversationId: conversation.id, role: "user", content: userContent },
  });

  // Build the message list — system prompt prepended as a "user" turn since
  // the wrapper API uses Anthropic's shape which doesn't have a dedicated
  // system role. Keep last 30 turns to bound tokens.
  const history = conversation.messages.slice(-30);
  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userContent },
  ];

  try {
    const { result } = await streamWithFallback({
      feature: "parent-chat",
      system: sysPrompt,
      messages,
      onEnd: async (event) => {
        try {
          const assistantContent = event.text.trim();
          if (assistantContent) {
            await db.chatMessage.create({
              data: {
                conversationId: conversation.id,
                role: "assistant",
                content: assistantContent,
              },
            });
            await db.conversation.update({
              where: { id: conversation.id },
              data: { updatedAt: new Date() },
            });
          }
        } catch (dbErr) {
          console.error("[chat onEnd error]", dbErr);
        }
      },
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
      headers: {
        "X-User-Message-Id": userMessage.id,
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[chat]", msg);
    // Don't delete the user message — the parent can see what they asked and retry.
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * DELETE /api/chat
 * Clears the parent's conversation history (deletes all messages).
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (tier !== "PREMIUM") {
    return NextResponse.json(CHAT_PAYWALL, { status: 403 });
  }

  // Delete the conversation entirely; getOrCreateConversation will lazily
  // make a fresh one on the next GET.
  await db.conversation.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
