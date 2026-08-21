export interface VideoResource {
  title: string;
  searchQuery: string;
  youtubeId?: string;
  url?: string;
}

const memoryCache = new Map<string, string>();

/**
 * Extracts an 11-character YouTube video ID from a URL, iframe src, or raw ID string.
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Searches YouTube for a query and extracts the first valid video ID.
 */
export async function searchYouTubeVideoId(query: string): Promise<string | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  // Direct video ID or URL in query
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) return directId;

  if (memoryCache.has(cleanQuery)) {
    return memoryCache.get(cleanQuery)!;
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const html = await res.text();
    // Match videoId from ytInitialData or links
    const match =
      html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/) ||
      html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);

    if (match && match[1]) {
      const videoId = match[1];
      memoryCache.set(cleanQuery, videoId);
      return videoId;
    }
  } catch (err) {
    console.error("[searchYouTubeVideoId] Error searching for:", cleanQuery, err);
  }

  return null;
}

/**
 * Enriches video resources array so each resource has a verified youtubeId and direct url.
 */
export async function enrichVideoResources(
  videos?: VideoResource[]
): Promise<VideoResource[]> {
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return [];
  }

  return Promise.all(
    videos.map(async (v) => {
      let youtubeId: string | undefined =
        v.youtubeId ||
        extractYouTubeVideoId(v.url) ||
        extractYouTubeVideoId(v.searchQuery) ||
        undefined;

      if (!youtubeId) {
        youtubeId =
          (await searchYouTubeVideoId(v.searchQuery || v.title)) || undefined;
      }

      return {
        ...v,
        youtubeId: youtubeId || undefined,
        url: youtubeId
          ? `https://www.youtube.com/watch?v=${youtubeId}`
          : v.url ||
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
              v.searchQuery || v.title
            )}`,
      };
    })
  );
}
