import { BookCheck, BarChart3, Star } from "lucide-react";

interface StatsRowProps {
  lessonsDoneToday: number;
  totalLessonsToday: number;
  curriculumPercent: number;
  bloomStars: number;
}

export function StatsRow({
  lessonsDoneToday,
  totalLessonsToday,
  curriculumPercent,
  bloomStars,
}: StatsRowProps) {
  const stats = [
    {
      icon: <BookCheck className="w-4 h-4 text-brand-green" />,
      value: `${lessonsDoneToday}/${totalLessonsToday}`,
      label: "Lessons done",
      bg: "bg-brand-mint border border-brand-green/20",
    },
    {
      icon: <BarChart3 className="w-4 h-4 text-[#1C4E75]" />,
      value: `${curriculumPercent}%`,
      label: "Curriculum covered",
      bg: "bg-[#F0F5F9] border border-[#CDE0EE]",
    },
    {
      icon: <Star className="w-4 h-4 fill-amber-400 text-amber-500" />,
      value: bloomStars,
      label: "Bloom stars",
      bg: "bg-brand-amber border border-amber-300/40",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-2xl border border-border/80 px-4 py-3.5 shadow-2xs hover:shadow-xs transition-shadow"
        >
          <div
            className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-2.5 shadow-2xs`}
          >
            {s.icon}
          </div>
          <p className="font-display font-bold text-xl text-brand-green-deep leading-none">
            {s.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-sans">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
