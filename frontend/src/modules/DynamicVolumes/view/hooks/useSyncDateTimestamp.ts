import React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import { isoStringToTimestampUtcMs, timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import type { WorkbenchServices } from "@framework/WorkbenchServices";

/**
 * Two-way sync of the active timestamp via SyncSettingKey.DATE.
 *
 * - Incoming: converts the synced `{ timeOrInterval }` ISO string → UTC-ms
 *   and snaps to the nearest available timestamp before setting the atom.
 * - Outgoing: publishes the current activeTimestampUtcMs as a compact ISO
 *   string whenever it changes.
 */
export function useSyncDateTimestamp(
    viewContext: ViewContext<any>,
    workbenchServices: WorkbenchServices,
    activeTimestampUtcMs: number | null,
    setActiveTimestampUtcMs: (ts: number | null) => void,
    availableTimestamps: number[],
): void {
    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices,
        moduleContext: viewContext,
    });

    const syncedDate = syncHelper.useValue(SyncSettingKey.DATE, "global.syncValue.date");

    // ── Receive: synced date → active timestamp ──

    const [prevSyncedDate, setPrevSyncedDate] = React.useState<{ timeOrInterval: string } | null>(null);

    React.useEffect(
        function applySyncedDate() {
            if (syncedDate == null || syncedDate === prevSyncedDate) return;
            setPrevSyncedDate(syncedDate);

            const targetMs = isoStringToTimestampUtcMs(syncedDate.timeOrInterval);
            if (Number.isNaN(targetMs)) return;

            // Snap to nearest available timestamp if we have data
            if (availableTimestamps.length > 0) {
                let bestIdx = 0;
                let bestDist = Math.abs(availableTimestamps[0] - targetMs);
                for (let i = 1; i < availableTimestamps.length; i++) {
                    const dist = Math.abs(availableTimestamps[i] - targetMs);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }
                setActiveTimestampUtcMs(availableTimestamps[bestIdx]);
            } else {
                setActiveTimestampUtcMs(targetMs);
            }
        },
        [syncedDate, prevSyncedDate, availableTimestamps, setActiveTimestampUtcMs],
    );

    // ── Publish: active timestamp → synced date ──

    React.useEffect(
        function publishActiveTimestamp() {
            if (activeTimestampUtcMs != null) {
                syncHelper.publishValue(SyncSettingKey.DATE, "global.syncValue.date", {
                    timeOrInterval: timestampUtcMsToCompactIsoString(activeTimestampUtcMs),
                });
            }
        },
        [activeTimestampUtcMs, syncHelper],
    );
}
