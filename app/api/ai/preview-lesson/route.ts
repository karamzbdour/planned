import { NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/ai";
import { rateLimit } from "@/lib/rateLimit";

interface PreviewRequest {
  childName?: string;
  age?: number;
  interests?: string[];
  learningStyle?: string;
  curriculum?: string;
  faith?: string;
  faithIntegration?: boolean;
  location?: string;
  subject?: string;
}

export interface PreviewLesson {
  subject: string;
  topic: string;
  headline: string;
  description: string;
  learningObjective: string;
  tailoredActivity: {
    title: string;
    instructions: string;
    badge: string;
  };
  localDayOut?: {
    venue: string;
    idea: string;
  };
  faithReflection?: string;
}

function generateFallbackPreview(params: PreviewRequest): PreviewLesson {
  const name = params.childName?.trim() || "your child";
  const age = params.age || 6;
  const interests = params.interests?.length ? params.interests : ["animals", "drawing"];
  const interestWord = interests[0] || "nature";
  const learningStyle = params.learningStyle || "hands-on";
  const location = params.location?.trim() || "your local area";
  const subject = params.subject || "Science";

  const activityBadge =
    learningStyle === "visual"
      ? "Visual Illustration & Diagram"
      : learningStyle === "auditory"
      ? "Storytelling & Discussion"
      : "Hands-on Experiment & Craft";

  return {
    subject,
    topic: `${interestWord.charAt(0).toUpperCase() + interestWord.slice(1)} & The Natural World`,
    headline: `Discovering ${interestWord} with ${name}`,
    description: `A personalized ${age}-year-old lesson crafted to combine ${name}'s love for ${interests.join(
      " and "
    )} with core ${subject} principles.`,
    learningObjective: `Identify key traits and behaviors in ${interestWord} through active observation and creative design.`,
    tailoredActivity: {
      badge: activityBadge,
      title: `Build a Mini ${interestWord.charAt(0).toUpperCase() + interestWord.slice(1)} Habitat`,
      instructions: `Using household recyclable materials, ${name} creates a 3D habitat model suited for their favorite creatures, testing and explaining how each part keeps them safe.`,
    },
    localDayOut: {
      venue: `${location} Nature Trails & Discovery Spots`,
      idea: `Take an outdoor field trip around ${location} to spot real-world habitats and collect leaf and stone samples.`,
    },
    faithReflection:
      params.faith && params.faith !== "SECULAR"
        ? `Reflecting on the harmony and care found throughout creation.`
        : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";
    const limitCheck = rateLimit(`preview-lesson:${ip}`, 15, 60_000);
    if (!limitCheck.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few seconds." },
        { status: 429 }
      );
    }

    const body: PreviewRequest = await req.json().catch(() => ({}));
    const childName = body.childName?.trim() || "Your Child";
    const age = body.age || 6;
    const interests = body.interests?.length ? body.interests.join(", ") : "general exploration, art";
    const learningStyle = body.learningStyle || "hands-on";
    const curriculum = body.curriculum || "British National Curriculum";
    const faith = body.faith || "SECULAR";
    const faithIntegration = Boolean(body.faithIntegration);
    const location = body.location?.trim() || "United Kingdom";
    const subject = body.subject || "Science";

    // Try live AI generation via Gemini
    try {
      const prompt = `You are an expert homeschool AI tutor generating a short, exciting, bespoke sample lesson preview for a UK homeschooling family.

Child: ${childName} (Age: ${age})
Interests: ${interests}
Learning Style: ${learningStyle}
Curriculum: ${curriculum}
Subject: ${subject}
Location: ${location}
Faith: ${faith} (Integrate faith: ${faithIntegration})

Generate a concise JSON response matching EXACTLY this structure (no markdown, just pure JSON):
{
  "subject": "${subject}",
  "topic": "Creative, interest-led topic name",
  "headline": "Enthusiastic title for ${childName}",
  "description": "2-sentence warm summary of this lesson",
  "learningObjective": "1 clear, age-appropriate learning objective",
  "tailoredActivity": {
    "badge": "e.g. Hands-on Experiment or Visual Mind Map",
    "title": "Activity name linking ${interests} to ${subject}",
    "instructions": "2 sentence explanation of how ${childName} will do this activity"
  },
  "localDayOut": {
    "venue": "A real museum, park, centre or landmark near or in ${location}",
    "idea": "1 sentence practical excursion activity related to this topic"
  },
  ${faith !== "SECULAR" && faithIntegration ? '"faithReflection": "1 warm sentence connecting this to faith values",' : '"faithReflection": null,'}
}`;

      const res = await ai.messages.create({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });

      const text = res.content[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: PreviewLesson = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ preview: parsed });
      }
    } catch (aiErr) {
      console.warn("AI generation failed for onboarding preview, falling back to synthesis:", aiErr);
    }

    // Fallback template synthesis
    const fallback = generateFallbackPreview(body);
    return NextResponse.json({ preview: fallback });
  } catch (error) {
    console.error("Preview lesson route error:", error);
    return NextResponse.json({ preview: generateFallbackPreview({}) });
  }
}
