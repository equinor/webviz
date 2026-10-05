import type { ICustomProperties } from "@microsoft/applicationinsights-web";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

/*
    Spike: minimal Azure Application Insights integration for the frontend.

    The connection string is injected at build time via the
    VITE_APPLICATIONINSIGHTS_CONNECTION_STRING environment variable. When it is
    not set, telemetry is simply disabled and all helpers below become no-ops so
    local/dev builds keep working without any Azure configuration.
*/

let appInsights: ApplicationInsights | null = null;

export function initTelemetry(): void {
    if (appInsights) {
        return;
    }

    const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (!connectionString) {
        return;
    }

    appInsights = new ApplicationInsights({
        config: {
            connectionString,
            // We track page views explicitly on in-app navigation (see NavigationManager)
            // to get a fresh operation_Id per logical operation, so leave auto tracking off.
            enableAutoRouteTracking: false,
            // Capture AJAX/fetch dependencies and correlate them with backend traces.
            disableFetchTracking: false,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            // Report unhandled browser exceptions automatically.
            autoTrackPageVisitTime: true,
        },
    });

    appInsights.loadAppInsights();
    appInsights.trackPageView();
}

export function getAppInsights(): ApplicationInsights | null {
    return appInsights;
}

/*
    Tracks a page view, which mints a fresh operation_Id. Call this when starting
    a logical new "operation" (e.g. an in-app navigation) so telemetry isn't all
    grouped under a single operation for the whole browser session.
*/
export function trackPageView(name?: string, uri?: string): void {
    appInsights?.trackPageView({ name, uri });
}

export function setTelemetryUser(userId: string | null): void {
    if (!appInsights) {
        return;
    }

    if (userId) {
        // The authenticated user id must not contain spaces or the characters ,;=|
        const sanitizedUserId = userId.replace(/[\s,;=|]/g, "_");
        appInsights.setAuthenticatedUserContext(sanitizedUserId, undefined, true);
    } else {
        appInsights.clearAuthenticatedUserContext();
    }
}

export function trackEvent(name: string, properties?: ICustomProperties): void {
    appInsights?.trackEvent({ name }, properties);
}

export function trackException(error: Error, properties?: ICustomProperties): void {
    appInsights?.trackException({ exception: error }, properties);
}
