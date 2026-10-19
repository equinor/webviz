import { vi } from "vitest";

import {
    type DataProvider,
    isDataProvider,
} from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { SettingManager } from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import type { Item } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import type { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

export function findItem<TItem extends Item = Item>(manager: DataProviderManager, name: string): TItem {
    const item = manager
        .getGroupDelegate()
        .getDescendantItems((candidate) => candidate.getItemDelegate().getName() === name)[0];
    if (!item) {
        throw new Error(`No item named '${name}'`);
    }
    return item as TItem;
}

export function findProvider(manager: DataProviderManager, name: string): DataProvider<any, any, any> {
    const item = findItem(manager, name);
    if (!isDataProvider(item)) {
        throw new Error(`Item '${name}' is not a data provider`);
    }
    return item;
}

export function getProviderSetting(provider: DataProvider<any, any, any>, setting: Setting): SettingManager<any> {
    return provider.getSettingsContextDelegate().getSettings()[setting];
}

function isSettled(manager: DataProviderManager): boolean {
    return !manager.isDeserializing() && manager.getGroupDelegate().getPendingDescendantDataProviders().length === 0;
}

/*
 * Advances fake time (vi.useFakeTimers() must be active) until the manager has finished restoring and no data provider
 * is pending - checked twice in a row, so that a refetch scheduled by the last change has run as well.
 */
export async function settle(manager: DataProviderManager, timeoutMs = 5_000): Promise<void> {
    const stepMs = 20;
    let consecutiveSettledChecks = 0;
    for (let elapsedMs = 0; elapsedMs < timeoutMs; elapsedMs += stepMs) {
        await vi.advanceTimersByTimeAsync(stepMs);
        consecutiveSettledChecks = isSettled(manager) ? consecutiveSettledChecks + 1 : 0;
        if (consecutiveSettledChecks === 2) {
            return;
        }
    }

    const pendingProviderNames = manager
        .getGroupDelegate()
        .getPendingDescendantDataProviders()
        .map((provider) => `${provider.getItemDelegate().getName()} (${provider.getStatus()})`);
    throw new Error(
        `Not settled after ${timeoutMs} ms - deserializing: ${manager.isDeserializing()}, pending providers: ${pendingProviderNames.join(", ") || "none"}`,
    );
}
