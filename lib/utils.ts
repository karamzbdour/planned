import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const UK_YEAR_GROUPS = [
  "Reception",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
] as const;

export type UKYearGroup = (typeof UK_YEAR_GROUPS)[number];

export const BLOOM_LEVELS = {
  SEEDLING: { min: 0, max: 99, label: "Seedling", emoji: "🌱" },
  SPROUT: { min: 100, max: 299, label: "Sprout", emoji: "🌿" },
  BLOOM: { min: 300, max: 599, label: "Bloom", emoji: "🌸" },
  FLOURISH: { min: 600, max: 999, label: "Flourish", emoji: "🌺" },
  RADIANT: { min: 1000, max: Infinity, label: "Radiant", emoji: "🌟" },
} as const;

export function getBloomLevel(points: number) {
  for (const level of Object.values(BLOOM_LEVELS)) {
    if (points >= level.min && points <= level.max) return level;
  }
  return BLOOM_LEVELS.SEEDLING;
}

export interface VideoReference {
  title?: string;
  searchQuery?: string;
  url?: string;
  youtubeId?: string;
  videoId?: string;
}

export function getYouTubeEmbedUrl(video: VideoReference | string): string {
  if (typeof video === "string") {
    video = { searchQuery: video };
  }

  const directId = video.youtubeId || video.videoId;
  if (directId) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(directId)}`;
  }

  const target = video.url || video.searchQuery || "";
  if (!target) return "";

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = target.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(target.trim())) {
    return `https://www.youtube-nocookie.com/embed/${target.trim()}`;
  }

  return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(target.trim())}`;
}

export function getYouTubeWatchUrl(video: VideoReference | string): string {
  if (typeof video === "string") {
    video = { searchQuery: video };
  }

  const directId = video.youtubeId || video.videoId;
  if (directId) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(directId)}`;
  }

  const target = video.url || video.searchQuery || "";
  if (!target) return "https://www.youtube.com";

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = target.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/watch?v=${match[1]}`;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(target.trim())) {
    return `https://www.youtube.com/watch?v=${target.trim()}`;
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(target.trim())}`;
}

