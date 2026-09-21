// TUTORIAL_MEDIA_LOCAL_BASE_URL is injected by vite.config.ts: "/tutorial-videos" when that public folder
// exists, otherwise "" so the app falls back to the Azure blob container below.
import { TUTORIAL_MEDIA_LOCAL_BASE_URL } from "virtual:tutorial-media-base-url";

const DEFAULT_TUTORIAL_MEDIA_BASE_URL = "https://webviz.blob.core.windows.net/tutorial-videos";

export const TUTORIAL_MEDIA_BASE_URL = TUTORIAL_MEDIA_LOCAL_BASE_URL || DEFAULT_TUTORIAL_MEDIA_BASE_URL;

export function getVideoUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.webm`;
}

export function getThumbnailUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.png`;
}

export function getStepsUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.steps.json`;
}
