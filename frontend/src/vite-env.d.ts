/// <reference types="vite/client" />

declare module "virtual:tutorial-media-base-url" {
    /** "/tutorial-videos" when the local public folder exists, otherwise "" (app falls back to Azure). */
    export const TUTORIAL_MEDIA_LOCAL_BASE_URL: string;
}
