import Link from "next/link";
import {
  Sparkles,
  MapPin,
  BookOpen,
  TrendingUp,
  Star,
  Check,
  ArrowRight,
  Flower2,
  Shield,
  Clock,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[hsl(var(--border))]">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
        <BrandLogo size="md" href="/" />
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-brand-green-deep transition-colors hidden sm:block"
          >
            Pricing
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-muted-foreground hover:text-brand-green-deep transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-semibold text-white bg-brand-green hover:bg-brand-green-deep px-4 py-2 rounded-xl transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Feature cards data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    color: "bg-[#F4EFF8] text-[#4E2B6F] border border-[#DDCFEA]",
    title: "AI lesson plans in seconds",
    body: "Planned generates a full week of personalised lessons — teaching guide, activities, quiz, and a YouTube resource link — tailored to your child's year group and interests.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    color: "bg-[#EFF6F6] text-[#1B5760] border border-[#C7E3E5]",
    title: "Local day outs included",
    body: "Every lesson plan can include a suggested day out near you — museums, nature spots, historical sites — matched to the topic you're teaching.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-[#F0F5F9] text-[#1C4E75] border border-[#CDE0EE]",
    title: "Progress tracking that works",
    body: "Track topics completed, objectives met, and time spent per subject. Clear visual bars show exactly where each child is in the year's curriculum.",
  },
  {
    icon: <Flower2 className="w-5 h-5" />,
    color: "bg-brand-amber text-amber-900 border border-amber-300/50",
    title: "Bloom reward garden",
    body: "Children earn stars for completed lessons. A growing garden SVG unlocks new elements — flowers, trees, butterflies — as milestones are hit. Badges celebrate achievements.",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-[#F8F1F5] text-[#6B2856] border border-[#E7CFDF]",
    title: "Scrapbook journal",
    body: "Log day trips, breakthroughs, and creative moments with photos, tags, and notes. Timeline view groups entries by week. Export a print-ready PDF keepsake.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    color: "bg-[#EEF6F1] text-[#1F5C38] border border-[#C8E5D2]",
    title: "Faith-aware curriculum",
    body: "Choose to weave Islamic, Christian, or Jewish connections naturally into lessons — through stories, references, and Arabic text — or keep everything secular.",
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "Planned saves me at least two hours of planning every week. The lessons feel genuinely tailored to my children, not just generic worksheets.",
    name: "Sarah M.",
    detail: "Homeschooling mum of two, Manchester",
    avatar: "S",
    color: "bg-[#1C4E75]",
  },
  {
    quote: "The Bloom garden is what sold my kids on it. My 8-year-old checks every morning to see if a new flower has appeared in her garden!",
    name: "Ibrahim K.",
    detail: "Home educator, Birmingham",
    avatar: "I",
    color: "bg-[#1F5C38]",
  },
  {
    quote: "Having faith connections built into the Science lessons is exactly what we needed. It just flows naturally — no awkward add-ons.",
    name: "Fatima R.",
    detail: "Islamic homeschool, London",
    avatar: "F",
    color: "bg-[#7B4E12]",
  },
];

// ─── Pricing preview ──────────────────────────────────────────────────────────

const PLANS_PREVIEW = [
  { name: "Free",    price: "£0",     desc: "1 child · 1 week of lessons",   cta: "Start free",    href: "/onboarding", primary: false },
  { name: "Basic",   price: "£7.99",  desc: "2 children · Full month plan",  cta: "Start Basic",   href: "/pricing",    primary: true  },
  { name: "Premium", price: "£14.99", desc: "Unlimited · Full year + PDF",   cta: "Start Premium", href: "/pricing",    primary: false },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF6ED]">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-brand-mint border border-brand-green/20 text-brand-green-deep text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-green" />
          AI-powered home education planning for UK families
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-brand-green-deep leading-tight mb-6 max-w-3xl mx-auto">
          Home education,{" "}
          <span className="text-brand-green">done for you</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Planned generates personalised lesson plans, tracks your child&apos;s progress,
          rewards their learning with a growing garden, and keeps memories in a beautiful journal.
          All you do is teach.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
          >
            Get started — it&apos;s free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-white border border-border/80 hover:border-brand-green/30 text-brand-green-deep font-semibold text-base px-8 py-4 rounded-2xl shadow-2xs hover:bg-brand-mint/30 transition-all"
          >
            See pricing
          </Link>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground font-sans">
          {[
            { icon: <Clock className="w-4 h-4" />, text: "Set up in 5 minutes" },
            { icon: <Users className="w-4 h-4" />, text: "Built for UK curriculum" },
            { icon: <Shield className="w-4 h-4" />, text: "No card required" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-1.5">
              <span className="text-brand-green">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep mb-3">
            Everything you need to home educate well
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From lesson generation to progress tracking and celebration — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-border/70 p-6 space-y-3 hover:shadow-md hover:border-brand-green/30 transition-[border-color,box-shadow] duration-150 shadow-2xs"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.color} shadow-2xs`}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-lg text-brand-green-deep">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-sans">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-border/70 py-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep mb-3">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground">From initial sign up to teaching your first lesson.</p>
          </div>
          <div className="space-y-6">
            {[
              { step: "1", title: "Create your family profile", body: "Add your child's year group, learning style, interests, and faith preferences. Takes 2 minutes." },
              { step: "2", title: "Generate your first week", body: "Planned creates 5 days of personalised lessons — teaching guide, activities, quiz, day out ideas, and video links." },
              { step: "3", title: "Teach and tick off", body: "Work through lessons, tick off objectives, and mark lessons complete. Progress updates automatically." },
              { step: "4", title: "Celebrate and reflect", body: "Bloom stars and garden elements reward every lesson. Journal your memories. Export a PDF keepsake at the end of term." },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-brand-mint text-brand-green-deep border border-brand-green/20 font-serif font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-brand-green-deep mb-1 text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep mb-3">
            Loved by home educators
          </h2>
          <p className="text-muted-foreground">What families are saying about Planned</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-border/70 p-6 space-y-4 shadow-2xs hover:shadow-md transition-all"
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-brand-green-deep/90 leading-relaxed italic font-serif">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white font-serif font-bold text-sm shrink-0 shadow-2xs`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-green-deep">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing preview ───────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F4] border-y border-border/70 py-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep mb-3">
              Simple, honest pricing
            </h2>
            <p className="text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS_PREVIEW.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border-2 p-5 flex flex-col gap-4 shadow-2xs ${
                  p.primary
                    ? "border-brand-green shadow-md shadow-brand-green/10 bg-brand-mint/40"
                    : "border-border/80 bg-white"
                }`}
              >
                {p.primary && (
                  <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-green text-white shadow-2xs">
                    Most popular
                  </span>
                )}
                <div>
                  <p className="font-display font-bold text-xl text-brand-green-deep">{p.name}</p>
                  <p className="text-2xl font-bold text-brand-green-deep mt-1 font-serif">
                    {p.price}<span className="text-sm font-normal text-muted-foreground font-sans">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </div>
                <Link
                  href={p.href}
                  className={`w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${
                    p.primary
                      ? "bg-brand-green hover:bg-brand-green-deep text-white shadow-xs active:scale-[0.99]"
                      : "border border-border/80 bg-white text-brand-green-deep hover:border-brand-green/30 hover:bg-brand-mint/30"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All plans include a free trial period. No card required to start.
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-5 py-20 text-center">
        <BrandLogo size="xl" showWordmark={false} className="mx-auto mb-6" />
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep mb-4">
          Start your homeschool journey today
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Join families across the UK who are teaching with confidence, joy, and a plan.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white font-semibold text-lg px-10 py-4 rounded-2xl shadow-md transition-colors"
        >
          Get started — it&apos;s free
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-muted-foreground flex-wrap">
          {["No credit card required", "Set up in 5 minutes", "Cancel any time"].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <Check className="w-3 h-3 text-brand-green" />{t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[hsl(var(--border))] bg-white">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" href="/" />
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/pricing" className="hover:text-brand-green transition-colors">Pricing</Link>
            <Link href="/auth/signin" className="hover:text-brand-green transition-colors">Sign in</Link>
            <Link href="/onboarding" className="hover:text-brand-green transition-colors">Get started</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Planned. Built for UK home educators.
          </p>
        </div>
      </footer>
    </div>
  );
}
