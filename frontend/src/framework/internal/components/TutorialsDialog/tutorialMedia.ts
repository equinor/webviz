// VITE_TUTORIAL_MEDIA_BASE_URL is set by vite.config.ts: "/tutorial-videos" when that public folder
// exists, otherwise "" so the app falls back to the Azure blob container below.
const DEFAULT_TUTORIAL_MEDIA_BASE_URL = "https://webviz.blob.core.windows.net/tutorial-videos";

export const TUTORIAL_MEDIA_BASE_URL = import.meta.env.VITE_TUTORIAL_MEDIA_BASE_URL || DEFAULT_TUTORIAL_MEDIA_BASE_URL;

export function getVideoUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.webm`;
}

export function getThumbnailUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.png`;
}

export function getStepsUrl(slug: string): string {
    return `${TUTORIAL_MEDIA_BASE_URL}/${slug}.steps.json`;
}

// The container is private; blob URLs need a short-lived read SAS token appended to be fetchable.
export function appendSasToken(url: string, sasToken: string | undefined): string | undefined {
    return sasToken ? `${url}?${sasToken}` : undefined;
}
