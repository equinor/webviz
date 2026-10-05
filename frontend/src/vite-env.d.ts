/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Base URL for tutorial media; "" (or unset) means fall back to the app's Azure default.
    readonly VITE_TUTORIAL_MEDIA_BASE_URL?: string;
    // Azure Application Insights connection string. When unset, frontend telemetry is disabled.
    readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
}
