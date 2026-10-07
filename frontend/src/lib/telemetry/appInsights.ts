import type { ICustomProperties, ITelemetryItem } from "@microsoft/applicationinsights-web";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { getTelemetryConfig, TelemetryConfig_api } from "@api";


let appInsightsSingleton: ApplicationInsights | null = null;


function createConfiguredAppInsights(telemetryConfig: TelemetryConfig_api): ApplicationInsights {
    const ai = new ApplicationInsights({
        config: {
            connectionString: telemetryConfig.insights_connection_string,
            // Default SDK behavior: the initial page view is tracked on load and telemetry groups
            // under the session. SPA route changes are not tracked as separate page views.
            enableAutoRouteTracking: false,
            // Capture AJAX/fetch dependencies and correlate them with backend traces.
            disableFetchTracking: false,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            // Report unhandled browser exceptions automatically.
            autoTrackPageVisitTime: true,
            // To stop Chrome complaining: "Permissions policy violation: unload is not allowed in this document"
            disablePageUnloadEvents: ["unload"],
        },
    });

    ai.loadAppInsights();

    // Static context is applied to every telemetry item without a per-item callback.
    ai.context.application.ver = telemetryConfig.commit_sha; // -> application_Version

    if (telemetryConfig.user_pseudonym) {
        // The user id we set here shows up as "Auth Id", "Authenticated user Id" or user_AuthenticatedId in Application Insights
        ai.setAuthenticatedUserContext(telemetryConfig.user_pseudonym, undefined, true);
    }

    // Telemetry initializers run per item to enrich or drop telemetry before it is sent.
    ai.addTelemetryInitializer(function enrichTelemetryItem(item: ITelemetryItem): boolean {
        item.tags = item.tags ?? {};

        // Shows up as the role name in Application Insights
        item.tags["ai.cloud.role"] = `${telemetryConfig.radix_environment}.webviz-ui`;

        // To be consistent with the telemetry we're injecting in the backend, we override the SDK's anonymous user_Id with the pseudonym.
        // This ensures that the user identifier is consistent across both frontend and backend telemetry and avoids double-counting the same person across the two tiers.
        //
        // Note that the value set here shows up as "User Id" or "user_Id" in Application Insights.
        // It is also the value used for users counts, Users/Sessions/Events blades, User Flows, retention etc in Application Insights.
        // We make sure we always set some value here, even if we have no pseudonym
        item.tags["ai.user.id"] = telemetryConfig.user_pseudonym ?? "UnidentifiedUser";

        // Return true to indicate that the telemetry item should be sent, false would drop it.
        return true; 
    });

    return ai;
}


// Initializes telemetry by fetching the config from the backend and setting up App Insights.
// Call this once the user is authenticated. Safe to call more than once.
export async function initializeTelemetryFromBackend(): Promise<void> {
    if (appInsightsSingleton) {
        return;
    }

    try {
        const requestResult = await getTelemetryConfig({ throwOnError: true });
        appInsightsSingleton = createConfiguredAppInsights(requestResult.data);
        appInsightsSingleton.trackPageView();
    }
    catch (error) {
        // Telemetry is optional so never let its setup break the app.
        console.warn("Failed to initialize telemetry from backend", error);
    }
}

export function shutdownTelemetry(): void {
    if (!appInsightsSingleton) {
        return;
    }

    appInsightsSingleton.clearAuthenticatedUserContext();
    appInsightsSingleton.unload(false);
    appInsightsSingleton = null;
}


export function getAppInsights(): ApplicationInsights | null {
    return appInsightsSingleton;
}

/*
    Tracks a page view, which mints a fresh operation_Id. Call this when starting
    a logical new "operation" (e.g. an in-app navigation) so telemetry isn't all
    grouped under a single operation for the whole browser session.
*/
export function trackPageView(name?: string, uri?: string): void {
    appInsightsSingleton?.trackPageView({ name, uri });
}

export function trackEvent(name: string, properties?: ICustomProperties): void {
    appInsightsSingleton?.trackEvent({ name }, properties);
}

export function trackException(error: Error, properties?: ICustomProperties): void {
    appInsightsSingleton?.trackException({ exception: error }, properties);
}
