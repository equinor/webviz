import { postGetTimestampsForEnsemblesOptions, type EnsembleIdent_api } from "@api";
import { EnsembleTimestampsStore, type EnsembleTimestamps } from "@framework/EnsembleTimestampsStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { QueryClient } from "@tanstack/query-core";

import type { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";

const ENSEMBLE_POLLING_INTERVAL = 60000; // 60 seconds

export class EnsembleUpdateMonitor {
    private _workbenchSession: PrivateWorkbenchSession;
    private _queryClient: QueryClient;
    private _pollingEnabled: boolean = false;
    private _isRunning: boolean = false;
    private _pollingTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(workbenchSession: PrivateWorkbenchSession, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._queryClient = queryClient;
    }

    startPolling() {
        if (this._pollingEnabled) {
            return; // Already polling
        }

        // This shouldn't happen, but we check just in case
        if (this._pollingTimeout) {
            console.warn("Found a waiting polling call, even though polling was disabled");
            clearTimeout(this._pollingTimeout);
        }

        console.debug("checkForEnsembleUpdate - initializing...");
        this._pollingEnabled = true;
        this.recursivelyQueueEnsemblePolling();
    }

    stopPolling() {
        if (!this._pollingEnabled) {
            return; // Not currently polling
        }

        console.debug("checkForEnsembleUpdate - stopping...");
        this._pollingEnabled = false;

        if (this._pollingTimeout) {
            clearTimeout(this._pollingTimeout);
            this._pollingTimeout = null;
        }
    }

    private async recursivelyQueueEnsemblePolling() {
        if (!this._pollingEnabled) {
            return; // Stop if polling is disabled
        }

        await this.pollForUpdatedEnsembles();

        if (!this._pollingEnabled) {
            return; // Stop if polling is disabled
        }

        console.debug("checkForEnsembleUpdate - queuing next...");
        this._pollingTimeout = setTimeout(async () => {
            this.recursivelyQueueEnsemblePolling();
        }, ENSEMBLE_POLLING_INTERVAL);
    }

    private async pollForUpdatedEnsembles() {
        if (!this._pollingEnabled) {
            return; // Stop if polling is disabled
        }

        if (this._isRunning) {
            console.warn("Ensemble polling is already running, skipping this cycle.");
            return; // Prevent concurrent polling
        }
        this._isRunning = true;

        console.debug("checkForEnsembleUpdate - fetching...");

        try {
            const allRegularEnsembleIdents: Set<RegularEnsembleIdent> = new Set(
                this._workbenchSession
                    .getEnsembleSet()
                    .getRegularEnsembleArray()
                    .map((ens) => ens.getIdent()),
            );

            // Collect all delta ensembles' reference and comparison ensembles
            const deltaEnsembles = this._workbenchSession.getEnsembleSet().getDeltaEnsembleArray();
            for (const deltaEnsemble of deltaEnsembles) {
                allRegularEnsembleIdents.add(deltaEnsemble.getComparisonEnsembleIdent());
                allRegularEnsembleIdents.add(deltaEnsemble.getReferenceEnsembleIdent());
            }

            // If there are no ensembles to check, we can exit early
            if (allRegularEnsembleIdents.size === 0) {
                console.debug("checkForEnsembleUpdate - no ensembles to check, exiting...");
                return;
            }

            // Fetch the latest timestamps for all ensembles
            const latestTimestamps = await this.fetchLatestEnsembleTimestamps(Array.from(allRegularEnsembleIdents));

            if (latestTimestamps.length !== allRegularEnsembleIdents.size) {
                console.warn(
                    `Expected ${allRegularEnsembleIdents.size} timestamps, received ${latestTimestamps.length}.`,
                );
            }

            const latestTimestampsMap = new Map<string, EnsembleTimestamps>();

            // Update the ensemble timestamps map
            for (const [ident, timestamps] of latestTimestamps) {
                latestTimestampsMap.set(ident.toString(), timestamps);
            }

            // Update the EnsembleTimestampsStore with the latest timestamps
            EnsembleTimestampsStore.setAll(latestTimestampsMap);

            console.debug("checkForEnsembleUpdate - fetched and updated timestamps for ensembles.");
        } catch (error) {
            console.error("Error during ensemble polling:", error);
        } finally {
            this._isRunning = false;
        }
    }

    private async fetchLatestEnsembleTimestamps(
        ensembleIdents: RegularEnsembleIdent[],
    ): Promise<[RegularEnsembleIdent, EnsembleTimestamps][]> {
        const idents = ensembleIdents.map<EnsembleIdent_api>((ens) => ({
            caseUuid: ens.getCaseUuid(),
            ensembleName: ens.getEnsembleName(),
        }));

        const timestamps = await this._queryClient.fetchQuery({
            ...postGetTimestampsForEnsemblesOptions({ body: idents }),
            staleTime: 0,
            gcTime: 0,
        });

        return ensembleIdents.map((ident, i) => [ident, timestamps[i]]);
    }

    dispose() {
        this.stopPolling();
    }
}
