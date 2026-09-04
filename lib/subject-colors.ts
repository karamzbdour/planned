/**
 * Book-Cloth Heritage Subject Color System
 * Replaces uncalibrated Tailwind-500 primaries with a cohesive,
 * editorial palette inspired by traditional bookbindings and nature.
 */

export interface SubjectTheme {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  text: string;
  dot: string;
  accentBg: string;
  solidBg: string;
}

export const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  mathematics: {
    name: "Mathematics",
    badgeBg: "bg-[#F0F5F9]",
    badgeBorder: "border-[#CDE0EE]",
    text: "text-[#1C4E75]",
    dot: "bg-[#1C4E75]",
    accentBg: "bg-[#1C4E75]/10",
    solidBg: "bg-[#1C4E75]",
  },
  maths: {
    name: "Maths",
    badgeBg: "bg-[#F0F5F9]",
    badgeBorder: "border-[#CDE0EE]",
    text: "text-[#1C4E75]",
    dot: "bg-[#1C4E75]",
    accentBg: "bg-[#1C4E75]/10",
    solidBg: "bg-[#1C4E75]",
  },
  english: {
    name: "English",
    badgeBg: "bg-[#F8F1F5]",
    badgeBorder: "border-[#E7CFDF]",
    text: "text-[#6B2856]",
    dot: "bg-[#6B2856]",
    accentBg: "bg-[#6B2856]/10",
    solidBg: "bg-[#6B2856]",
  },
  literacy: {
    name: "Literacy",
    badgeBg: "bg-[#F8F1F5]",
    badgeBorder: "border-[#E7CFDF]",
    text: "text-[#6B2856]",
    dot: "bg-[#6B2856]",
    accentBg: "bg-[#6B2856]/10",
    solidBg: "bg-[#6B2856]",
  },
  science: {
    name: "Science",
    badgeBg: "bg-[#EEF6F1]",
    badgeBorder: "border-[#C8E5D2]",
    text: "text-[#1F5C38]",
    dot: "bg-[#1F5C38]",
    accentBg: "bg-[#1F5C38]/10",
    solidBg: "bg-[#1F5C38]",
  },
  history: {
    name: "History",
    badgeBg: "bg-[#FAF4EB]",
    badgeBorder: "border-[#EEDBBF]",
    text: "text-[#7B4E12]",
    dot: "bg-[#7B4E12]",
    accentBg: "bg-[#7B4E12]/10",
    solidBg: "bg-[#7B4E12]",
  },
  geography: {
    name: "Geography",
    badgeBg: "bg-[#EFF6F6]",
    badgeBorder: "border-[#C7E3E5]",
    text: "text-[#1B5760]",
    dot: "bg-[#1B5760]",
    accentBg: "bg-[#1B5760]/10",
    solidBg: "bg-[#1B5760]",
  },
  art: {
    name: "Art",
    badgeBg: "bg-[#FDF2EE]",
    badgeBorder: "border-[#F6D7CC]",
    text: "text-[#8E3B20]",
    dot: "bg-[#8E3B20]",
    accentBg: "bg-[#8E3B20]/10",
    solidBg: "bg-[#8E3B20]",
  },
  music: {
    name: "Music",
    badgeBg: "bg-[#F4EFF8]",
    badgeBorder: "border-[#DDCFEA]",
    text: "text-[#4E2B6F]",
    dot: "bg-[#4E2B6F]",
    accentBg: "bg-[#4E2B6F]/10",
    solidBg: "bg-[#4E2B6F]",
  },
  "religious studies": {
    name: "Religious Studies",
    badgeBg: "bg-[#EFF2F8]",
    badgeBorder: "border-[#CDD7ED]",
    text: "text-[#28407B]",
    dot: "bg-[#28407B]",
    accentBg: "bg-[#28407B]/10",
    solidBg: "bg-[#28407B]",
  },
  re: {
    name: "RE",
    badgeBg: "bg-[#EFF2F8]",
    badgeBorder: "border-[#CDD7ED]",
    text: "text-[#28407B]",
    dot: "bg-[#28407B]",
    accentBg: "bg-[#28407B]/10",
    solidBg: "bg-[#28407B]",
  },
  pe: {
    name: "Physical Education",
    badgeBg: "bg-[#FDF3EB]",
    badgeBorder: "border-[#F8D8C0]",
    text: "text-[#8A4810]",
    dot: "bg-[#8A4810]",
    accentBg: "bg-[#8A4810]/10",
    solidBg: "bg-[#8A4810]",
  },
  "physical education": {
    name: "Physical Education",
    badgeBg: "bg-[#FDF3EB]",
    badgeBorder: "border-[#F8D8C0]",
    text: "text-[#8A4810]",
    dot: "bg-[#8A4810]",
    accentBg: "bg-[#8A4810]/10",
    solidBg: "bg-[#8A4810]",
  },
  computing: {
    name: "Computing",
    badgeBg: "bg-[#EEF5F8]",
    badgeBorder: "border-[#C9DFEA]",
    text: "text-[#1C516D]",
    dot: "bg-[#1C516D]",
    accentBg: "bg-[#1C516D]/10",
    solidBg: "bg-[#1C516D]",
  },
};

const DEFAULT_THEME: SubjectTheme = {
  name: "General",
  badgeBg: "bg-[#EFF4F6]",
  badgeBorder: "border-[#D1DFE4]",
  text: "text-[#2B5F75]",
  dot: "bg-[#2B5F75]",
  accentBg: "bg-[#2B5F75]/10",
  solidBg: "bg-[#2B5F75]",
};

export function getSubjectTheme(subject?: string | null): SubjectTheme {
  if (!subject) return DEFAULT_THEME;
  return SUBJECT_THEMES[subject.toLowerCase().trim()] ?? DEFAULT_THEME;
}
