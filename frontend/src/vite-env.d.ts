/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Base URL for tutorial media; "" (or unset) means fall back to the app's Azure default.
    readonly VITE_TUTORIAL_MEDIA_BASE_URL?: string;
}
