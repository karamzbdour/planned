"use client";

import { useState, useEffect } from "react";
import { Youtube, ExternalLink, Loader2 } from "lucide-react";
import { extractYouTubeVideoId } from "@/lib/youtube";
import type { VideoResource } from "@/lib/lessonGenerator";

interface YouTubeEmbedCardProps {
  video: VideoResource;
  isStreaming?: boolean;
}

export function YouTubeEmbedCard({ video, isStreaming = false }: YouTubeEmbedCardProps) {
  const initialId =
    video?.youtubeId ||
    extractYouTubeVideoId(video?.url) ||
    extractYouTubeVideoId(video?.searchQuery) ||
    null;

  const [resolvedId, setResolvedId] = useState<string | null>(initialId);
  const [loading, setLoading] = useState(!initialId);

  useEffect(() => {
    if (initialId) {
      setResolvedId(initialId);
      setLoading(false);
    }
  }, [initialId]);

  useEffect(() => {
    // If we're currently streaming content or already have an ID, do not fetch
    if (isStreaming || resolvedId) {
      setLoading(!resolvedId && isStreaming);
      return;
    }

    const query = video?.searchQuery || video?.title;
    if (!query || query.length < 4) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      fetch(`/api/youtube/resolve?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to resolve");
          return res.json();
        })
        .then((data) => {
          if (!cancelled && data.videoId) {
            setResolvedId(data.videoId);
          }
        })
        .catch((err) => {
          console.warn("[YouTubeEmbedCard] Resolve error:", err);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [video?.searchQuery, video?.title, video?.url, video?.youtubeId, resolvedId, isStreaming]);

  const directWatchUrl = resolvedId
    ? `https://www.youtube.com/watch?v=${resolvedId}`
    : video?.url && !video.url.includes("search_query")
    ? video.url
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(
        video?.searchQuery || video?.title || ""
      )}`;

  const embedUrl = resolvedId
    ? `https://www.youtube-nocookie.com/embed/${resolvedId}`
    : null;

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-xs">
      <div className="p-3.5 flex items-center justify-between gap-3 bg-muted/30 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600">
            <Youtube className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-green-deep truncate">
              {video?.title || "Educational Video"}
            </p>
            {video?.searchQuery && (
              <p className="text-xs text-muted-foreground truncate">
                Topic: {video.searchQuery}
              </p>
            )}
          </div>
        </div>
        <a
          href={directWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand-green bg-white hover:bg-brand-mint/60 border border-[hsl(var(--border))] px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          title="Open in YouTube"
        >
          <span>Open in YouTube</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="relative w-full aspect-video bg-black/5 flex items-center justify-center">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video?.title || "YouTube video player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs py-10">
            <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
            <span>Finding YouTube video…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs p-6 text-center">
            <Youtube className="w-8 h-8 text-red-500/60" />
            <span>Video preview unavailable</span>
            <a
              href={directWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-green hover:underline font-semibold"
            >
              Search on YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
