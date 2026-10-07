import type { ICustomProperties, ITelemetryItem } from "@microsoft/applicationinsights-web";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { getTelemetryConfig, TelemetryConfig_api } from "@api";


let appInsightsSingleton: ApplicationInsights | null = null;


function createConfiguredAppInsights(telemetryConfig: TelemetryConfig_api): ApplicationInsights {
    const ai = new ApplicationInsights({
        config: {
            connectionString: telemetryConfig.insights_connection_string,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            enableUnhandledPromiseRejectionTracking: true,

            // To stop Chrome complaining: "Permissions policy violation: unload is not allowed in this document"
            disablePageUnloadEvents: ["unload"],

            extensionConfig: {
                // Block the CfgSync plugin's CDN config fetch. Not needed and avoids a CSP exception.
                ["AppInsightsCfgSyncPlugin"]: {
                    blkCdnCfg: true,
                },
            },
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
        const telemetryConfig: TelemetryConfig_api = requestResult.data;
        appInsightsSingleton = createConfiguredAppInsights(telemetryConfig);
        console.info(`Successfully initialized telemetry from backend (user_pseudonym=${telemetryConfig.user_pseudonym}, commit_sha=${telemetryConfig.commit_sha}, radix_environment=${telemetryConfig.radix_environment})`);
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

    try {
        appInsightsSingleton.clearAuthenticatedUserContext();
        appInsightsSingleton.unload(false);
    }
    catch (error) {
        console.warn("Failed to cleanly shutdown telemetry", error);
    }

    appInsightsSingleton = null;
}


export function trackTelemetryEvent(name: string, properties?: ICustomProperties): void {
    appInsightsSingleton?.trackEvent({ name }, properties);
}


export function trackTelemetryError(error: Error, properties?: ICustomProperties): void {
    appInsightsSingleton?.trackException({ exception: error }, properties);
}
