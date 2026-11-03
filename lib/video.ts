/**
 * Video links → embeds. Listings store plain URLs (no uploaded files): Instagram
 * reels / posts and YouTube videos / Shorts are turned into iframe embeds here.
 */

export type VideoProvider = "youtube" | "instagram";

export interface VideoInfo {
  provider: VideoProvider;
  id: string;
  /** iframe src */
  embed: string;
  /** Original link, for "Open on Instagram / YouTube" */
  url: string;
  /** Reels and Shorts are vertical (9:16); regular YouTube videos are 16:9. */
  portrait: boolean;
  /** Static preview image when the provider offers one without an API call. */
  thumb?: string;
}

/** Parse a YouTube or Instagram URL. Returns null for anything else (e.g. legacy uploaded MP4s). */
export function videoInfo(raw: string): VideoInfo | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");

  if (host === "instagram.com" || host === "instagr.am") {
    // /reel/ID, /reels/ID, /p/ID, /tv/ID — optionally prefixed by a username: /name/reel/ID
    const id = u.pathname.match(/\/(?:reels?|p|tv)\/([\w-]+)/)?.[1];
    if (!id) return null;
    return { provider: "instagram", id, embed: `https://www.instagram.com/reel/${id}/embed`, url: `https://www.instagram.com/reel/${id}/`, portrait: true };
  }

  let id: string | null = null;
  let short = false;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
    short = m?.[1] === "shorts";
    id = u.searchParams.get("v") ?? m?.[2] ?? null;
  }
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  return {
    provider: "youtube",
    id,
    embed: `https://www.youtube-nocookie.com/embed/${id}`,
    url: short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
    portrait: short,
    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

/** YouTube / Instagram URL → embeddable URL (null for anything else). */
export function videoEmbed(url: string): string | null {
  return videoInfo(url)?.embed ?? null;
}
