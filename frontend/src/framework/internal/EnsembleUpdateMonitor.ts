import type { QueryClient } from "@tanstack/query-core";

import { EnsembleTimestampsStore, type EnsembleTimestamps } from "@framework/EnsembleTimestampsStore";
import { globalLog } from "@framework/Log";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { Workbench } from "@framework/Workbench";

import { fetchLatestEnsembleTimestamps } from "./utils/fetchEnsembleTimestamps";

const logger = globalLog.registerLogger("EnsembleUpdateMonitor");

const ENSEMBLE_POLLING_INTERVAL_MS = 60000; // 60 seconds

export class EnsembleUpdateMonitor {
    private _queryClient: QueryClient;
    private _pollingEnabled: boolean = false;
    private _isRunning: boolean = false;
    private _pollingTimeout: ReturnType<typeof setTimeout> | null = null;
    private _lastPollTimestamp: number | null = null;
    private _workbench: Workbench;

    constructor(queryClient: QueryClient, workbench: Workbench) {
        this._queryClient = queryClient;
        this._workbench = workbench;
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

        logger.console?.log("checkForEnsembleUpdate - initializing...");
        this._pollingEnabled = true;
        this.recursivelyQueueEnsemblePolling();
    }

    stopPolling() {
        if (!this._pollingEnabled) {
            return; // Not currently polling
        }

        logger.console?.log("checkForEnsembleUpdate - stopping...");
        this._pollingEnabled = false;

        if (this._pollingTimeout) {
            clearTimeout(this._pollingTimeout);
            this._pollingTimeout = null;
        }
    }

    async pollImmediately() {
        await this.pollForUpdatedEnsembles();
    }

    private async recursivelyQueueEnsemblePolling() {
        if (!this._pollingEnabled) {
            return; // Stop if polling is disabled
        }

        const now = Date.now();
        const elapsed = this._lastPollTimestamp ? now - this._lastPollTimestamp : Infinity;

        if (elapsed < ENSEMBLE_POLLING_INTERVAL_MS) {
            const wait = ENSEMBLE_POLLING_INTERVAL_MS - elapsed;
            logger.console?.log(`Polling skipped: only ${elapsed}ms elapsed since last poll. Waiting ${wait}ms...`);
            this._pollingTimeout = setTimeout(() => {
                this.recursivelyQueueEnsemblePolling();
            }, wait);
            return;
        }

        await this.pollForUpdatedEnsembles();

        if (!this._pollingEnabled) {
            return; // Stop if polling is disabled
        }

        logger.console?.log("checkForEnsembleUpdate - queuing next...");

        this._pollingTimeout = setTimeout(() => {
            this.recursivelyQueueEnsemblePolling();
        }, ENSEMBLE_POLLING_INTERVAL_MS);
    }

    private async pollForUpdatedEnsembles() {
        if (this._isRunning) {
            console.warn("Ensemble polling is already running, skipping this cycle.");
            return; // Prevent concurrent polling
        }
        this._isRunning = true;

        logger.console?.log(`checkForEnsembleUpdate - fetching...`);

        try {
            const workbenchSession = this._workbench.getWorkbenchSession();
            if (!workbenchSession) {
                console.warn(`No workbench session found, exiting...`);
                return;
            }

            const allRegularEnsembleIdents: Set<string> = new Set(
                workbenchSession
                    .getEnsembleSet()
                    .getRegularEnsembleArray()
                    .map((ens) => ens.getIdent().toString()),
            );

            // Collect all delta ensembles' reference and comparison ensembles
            const deltaEnsembles = workbenchSession.getEnsembleSet().getDeltaEnsembleArray();
            for (const deltaEnsemble of deltaEnsembles) {
                allRegularEnsembleIdents.add(deltaEnsemble.getComparisonEnsembleIdent().toString());
                allRegularEnsembleIdents.add(deltaEnsemble.getReferenceEnsembleIdent().toString());
            }

            // If there are no ensembles to check, we can exit early
            if (allRegularEnsembleIdents.size === 0) {
                logger.console?.log(`checkForEnsembleUpdate - no ensembles to check, exiting...`);
                return;
            }

            // Fetch the latest timestamps for all ensembles
            const latestTimestamps = await fetchLatestEnsembleTimestamps(
                this._queryClient,
                Array.from(allRegularEnsembleIdents).map((id) => RegularEnsembleIdent.fromString(id)),
            );

            if (latestTimestamps.length !== allRegularEnsembleIdents.size) {
                console.warn(
                    `Expected ${allRegularEnsembleIdents.size} timestamps, received ${latestTimestamps.length}.`,
                );
            }

            const latestTimestampsMap = new Map<string, EnsembleTimestamps>();

            // Update the ensemble timestamps map
            for (const item of latestTimestamps) {
                latestTimestampsMap.set(item.ensembleIdent.toString(), item.timestamps);
            }

            // Update the EnsembleTimestampsStore with the latest timestamps
            EnsembleTimestampsStore.setAll(latestTimestampsMap);

            logger.console?.log(`checkForEnsembleUpdate - fetched and updated timestamps for ensembles.`);
        } catch (error) {
            console.error(`Error during ensemble polling:`, error);
        } finally {
            this._lastPollTimestamp = Date.now();
            this._isRunning = false;
        }
    }

    dispose() {
        this.stopPolling();
    }
}
