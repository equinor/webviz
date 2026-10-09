import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import {
    type DataProvider,
    DataProviderStatus,
} from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { getProviderSetting, makeDataProviderManager, managerState } from "../../utils/dataProviderFramework";

type Deferred = { showLabels: boolean; resolve: (data: string) => void; reject: (error: unknown) => void };

// The fetches that have been started and not settled yet, in the order they were started
let pendingFetches: Deferred[] = [];

const SETTINGS = [Setting.SHOW_LABELS, Setting.SHOW_LINES] as const;

// Its fetch is work that doesn't stop when cancelled (e.g. processing after a request) - it only ends when the test
// settles it. The data depends on SHOW_LABELS. Hiding the lines makes the settings invalid by the provider's own rule,
// like clearing the selected wellbores does for the well trajectories.
class UncancellableFetchProvider implements CustomDataProviderImplementation<typeof SETTINGS, string> {
    settings = SETTINGS;

    getDefaultName(): string {
        return "Uncancellable fetch provider";
    }

    getDefaultSettingsValues(): Partial<MakeSettingTypesMap<typeof SETTINGS>> {
        return { [Setting.SHOW_LABELS]: false, [Setting.SHOW_LINES]: true };
    }

    setupBindings(): void {}

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<typeof SETTINGS, string>): boolean {
        return getSetting(Setting.SHOW_LINES) === true;
    }

    fetchData({ getSetting }: FetchDataParams<typeof SETTINGS, string>): Promise<string> {
        const showLabels = getSetting(Setting.SHOW_LABELS) ?? false;
        return new Promise((resolve, reject) => {
            pendingFetches.push({ showLabels, resolve, reject });
        });
    }
}

DataProviderRegistry.registerDataProvider("uncancellable-fetch-test-provider", UncancellableFetchProvider);

function takeFetch(showLabels: boolean): Deferred {
    const index = pendingFetches.findIndex((fetch) => fetch.showLabels === showLabels);
    if (index === -1) {
        throw new Error(`No pending fetch for showLabels = ${showLabels}`);
    }
    return pendingFetches.splice(index, 1)[0];
}

async function addProviderWithPendingFetch(): Promise<{
    manager: DataProviderManager;
    provider: DataProvider<any, any, any>;
}> {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    const provider = DataProviderRegistry.makeDataProvider("uncancellable-fetch-test-provider", manager);
    manager.getGroupDelegate().appendChild(provider);
    // Past the refetch debounce
    await vi.advanceTimersByTimeAsync(20);
    expect(pendingFetches).toHaveLength(1);
    return { manager, provider };
}

function countGuiStateRevisions(manager: DataProviderManager) {
    const onGuiStateRevision = vi.fn();
    manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);
    return onGuiStateRevision;
}

beforeEach(() => {
    vi.useFakeTimers();
    pendingFetches = [];
});

afterEach(() => {
    vi.useRealTimers();
});

describe("Stale fetches", () => {
    test("a fetch that finishes after its provider's tree was discarded changes nothing and publishes nothing", async () => {
        const { manager, provider } = await addProviderWithPendingFetch();
        manager.deserializeState(managerState([]));
        const onGuiStateRevision = countGuiStateRevisions(manager);
        const statusAfterDiscarding = provider.getStatus();

        takeFetch(false).resolve("stale data");
        await vi.advanceTimersByTimeAsync(20);

        expect(provider.getData()).toBeNull();
        expect(provider.getStatus()).toBe(statusAfterDiscarding);
        expect(onGuiStateRevision).not.toHaveBeenCalled();
    });

    test("a fetch that fails after its provider's tree was discarded changes nothing and publishes nothing", async () => {
        const { manager, provider } = await addProviderWithPendingFetch();
        manager.deserializeState(managerState([]));
        const onGuiStateRevision = countGuiStateRevisions(manager);

        takeFetch(false).reject(new Error("Request failed"));
        await vi.advanceTimersByTimeAsync(20);

        expect(provider.getStatus()).not.toBe(DataProviderStatus.ERROR);
        expect(onGuiStateRevision).not.toHaveBeenCalled();
    });

    test("a superseded fetch that finishes after the newer one doesn't replace its data", async () => {
        const { manager, provider } = await addProviderWithPendingFetch();
        takeFetch(false).resolve("data without labels");
        await vi.advanceTimersByTimeAsync(20);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(20);
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(false);
        await vi.advanceTimersByTimeAsync(20);
        takeFetch(true).resolve("data with labels");
        await vi.advanceTimersByTimeAsync(20);

        expect(provider.getData()).toBe("data without labels");
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        manager.beforeDestroy();
    });

    test("a fetch in flight when the provider's own rule makes the settings invalid doesn't replace INVALID_SETTINGS", async () => {
        const { manager, provider } = await addProviderWithPendingFetch();
        takeFetch(false).resolve("data without labels");
        await vi.advanceTimersByTimeAsync(20);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(20);
        getProviderSetting(provider, Setting.SHOW_LINES).setValue(false);
        await vi.advanceTimersByTimeAsync(20);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);

        takeFetch(true).resolve("data with labels");
        await vi.advanceTimersByTimeAsync(20);

        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        // Neither the stale result nor the earlier data, which invalid settings made outdated
        expect(provider.getData()).toBeNull();
        manager.beforeDestroy();
    });

    test("a superseded fetch that fails doesn't set the provider to ERROR", async () => {
        const { manager, provider } = await addProviderWithPendingFetch();
        takeFetch(false).resolve("data without labels");
        await vi.advanceTimersByTimeAsync(20);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(20);
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(false);
        await vi.advanceTimersByTimeAsync(20);
        takeFetch(true).reject(new Error("Request failed"));
        await vi.advanceTimersByTimeAsync(20);

        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        manager.beforeDestroy();
    });
});
