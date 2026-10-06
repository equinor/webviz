import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SettingsContextStatus } from "@modules/_shared/DataProviderFramework/delegates/SettingsContextDelegate";
import { DataProviderStatus } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    filterProvider,
    findProvider,
    getProviderSetting,
    gridProvider,
    makeDataProviderManager,
    managerState,
    settle,
    surfaceProvider,
    type TestBackend,
    resetTestBackend,
} from "../../utils/dataProviderFramework";

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = {
        depth: { "Top reservoir": [1, 2, 3], "Base reservoir": [1, 2] },
    };
    backend.catalogues["field-b"] = {
        depth: { "New surface": [1] },
        porosity: { "Mid reservoir": [7] },
    };
    backend.catalogues["empty-field"] = {};
    backend.grids["field-a"] = { "Simulation grid": 1000 };
});

afterEach(() => {
    vi.useRealTimers();
});

async function restore(...items: Parameters<typeof managerState>[0]) {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    manager.deserializeState(managerState(items));
    await settle(manager);
    return manager;
}

describe("Validity", () => {
    test("settings are LOADING while their allowed values are being resolved, and valid once they are", async () => {
        backend.delayMs = 100;
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        const provider = findProvider(manager, "Surface");

        await vi.advanceTimersByTimeAsync(50);
        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.LOADING);

        await settle(manager);
        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.VALID_SETTINGS);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });

    test("a provider is LOADING while its settings are being resolved again", async () => {
        const manager = await restore(surfaceProvider("Surface"));
        const provider = findProvider(manager, "Surface");
        backend.delayMs = 100;

        getProviderSetting(provider, Setting.SURFACE_NAME).setValue("Base reservoir");
        await vi.advanceTimersByTimeAsync(50);

        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.LOADING);
        expect(provider.getStatus()).toBe(DataProviderStatus.LOADING);
    });

    test("a provider is LOADING while its settings are being resolved for the first time", async () => {
        backend.delayMs = 100;
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        const provider = findProvider(manager, "Surface");

        await vi.advanceTimersByTimeAsync(50);

        expect(provider.getStatus()).toBe(DataProviderStatus.LOADING);
    });

    test("a selected value that is not allowed makes the settings invalid, and nothing is fetched for it", async () => {
        const manager = await restore(surfaceProvider("Surface"));
        const provider = findProvider(manager, "Surface");

        getProviderSetting(provider, Setting.REALIZATION).setValue(99);
        await settle(manager);

        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(backend.callsTo("getSurfaceData")).not.toContainEqual(["field-a", "depth", "Top reservoir", 99]);
    });

    test("a persisted value that is not allowed is kept, makes only its provider invalid, and restoring still finishes", async () => {
        const manager = await restore(
            surfaceProvider("Surface", { surfaceName: "Gone surface" }),
            gridProvider("Grid"),
        );
        const surface = findProvider(manager, "Surface");

        expect(surface.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(getProviderSetting(surface, Setting.SURFACE_NAME).isPersistedValue()).toBe(true);
        expect(surface.serializeState().settings[Setting.SURFACE_NAME]).toBe(JSON.stringify("Gone surface"));
        expect(backend.callsTo("getSurfaceData")).toHaveLength(0);
        expect(findProvider(manager, "Grid").getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(manager.isDeserializing()).toBe(false);
    });

    test("a persisted value that is not allowed is adopted once the allowed values include it", async () => {
        const manager = await restore(surfaceProvider("Surface", { attribute: "depth", surfaceName: "New surface" }));
        const provider = findProvider(manager, "Surface");
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);

        manager.updateGlobalSetting("fieldId", "field-b");
        await settle(manager);

        expect(getProviderSetting(provider, Setting.SURFACE_NAME).getValue()).toBe("New surface");
        expect(getProviderSetting(provider, Setting.SURFACE_NAME).isPersistedValue()).toBe(false);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(backend.callsTo("getSurfaceData")).toEqual([["field-b", "depth", "New surface", 1]]);
    });

    test("without any allowed values, settings stay empty and the provider's own rule makes it invalid", async () => {
        const manager = makeDataProviderManager({ fieldId: "empty-field" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        await settle(manager);
        const provider = findProvider(manager, "Surface");

        expect(getProviderSetting(provider, Setting.ATTRIBUTE).getValue()).toBeNull();
        expect(provider.areCurrentSettingsValid()).toBe(false);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(backend.callsTo("getSurfaceData")).toHaveLength(0);
    });
});

/*
 * Pins the current fix-up strategy: a value that is no longer allowed after a change elsewhere is replaced by the first
 * allowed value. This is planned to change, so that user-selected values are kept even when invalid - update these
 * tests with that change. (Filling an empty setting with the first allowed value is not part of this.)
 */
describe("Fix-up of values that became invalid - current strategy", () => {
    test("replaces a value that an upstream setting change made invalid with the first allowed value", async () => {
        const manager = await restore(surfaceProvider("Surface", { realization: 3 }));
        const provider = findProvider(manager, "Surface");
        expect(getProviderSetting(provider, Setting.REALIZATION).getValue()).toBe(3);

        getProviderSetting(provider, Setting.SURFACE_NAME).setValue("Base reservoir");
        await settle(manager);

        expect(getProviderSetting(provider, Setting.REALIZATION).getValue()).toBe(1);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(backend.callsTo("getSurfaceData").at(-1)).toEqual(["field-a", "depth", "Base reservoir", 1]);
    });

    test("replaces the values that a global setting change made invalid, all the way down the graph", async () => {
        const manager = await restore(surfaceProvider("Surface", { attribute: "depth", surfaceName: "Top reservoir" }));
        const provider = findProvider(manager, "Surface");

        manager.updateGlobalSetting("fieldId", "field-b");
        await settle(manager);

        expect(getProviderSetting(provider, Setting.ATTRIBUTE).getValue()).toBe("depth");
        expect(getProviderSetting(provider, Setting.SURFACE_NAME).getValue()).toBe("New surface");
        expect(getProviderSetting(provider, Setting.REALIZATION).getValue()).toBe(1);
        expect(provider.getData()?.surfaceName).toBe("New surface");
    });
});

describe("Hidden settings", () => {
    async function restoreIn(fieldId: string, ...items: Parameters<typeof managerState>[0]) {
        const manager = makeDataProviderManager({ fieldId });
        manager.deserializeState(managerState(items));
        await settle(manager);
        return manager;
    }

    test("a hidden setting without a valid value does not make its provider invalid", async () => {
        const manager = await restoreIn("empty-field", filterProvider("Filter"));
        const provider = findProvider(manager, "Filter");

        expect(getProviderSetting(provider, Setting.SURFACE_NAME).isValueValid()).toBe(false);
        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.VALID_SETTINGS);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });

    test("showing a setting without a valid value makes its provider invalid, and hiding it again makes it valid", async () => {
        const manager = await restoreIn("empty-field", filterProvider("Filter"));
        const provider = findProvider(manager, "Filter");
        const surfaceName = getProviderSetting(provider, Setting.SURFACE_NAME);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await settle(manager);
        expect(surfaceName.getAttributes().visible).toBe(true);
        expect(provider.getSettingsContextDelegate().getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(provider.getSettingsContextDelegate().getInvalidSettings()).toEqual([surfaceName.getLabel()]);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(false);
        await settle(manager);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });

    test("a shown setting still counts while it is disabled, as it explains why", async () => {
        const manager = await restoreIn("empty-field", filterProvider("Filter", { showLabels: true }));
        const provider = findProvider(manager, "Filter");

        expect(getProviderSetting(provider, Setting.SURFACE_NAME).getAttributes().enabled).toEqual({
            enabled: false,
            reason: "No surfaces",
        });
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
    });

    test("a rejected persisted value only makes its provider invalid while its setting is shown", async () => {
        const manager = await restore(filterProvider("Filter", { surfaceName: "Gone surface" }));
        const provider = findProvider(manager, "Filter");
        const surfaceName = getProviderSetting(provider, Setting.SURFACE_NAME);

        expect(surfaceName.isPersistedValue()).toBe(true);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await settle(manager);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(provider.getSettingsContextDelegate().getInvalidSettings()).toEqual([surfaceName.getLabel()]);
    });
});

describe("Naming the invalid settings", () => {
    test("names a setting that holds a rejected persisted value", async () => {
        const manager = await restore(surfaceProvider("Surface", { surfaceName: "Gone surface" }));
        const provider = findProvider(manager, "Surface");

        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(provider.getSettingsContextDelegate().getInvalidSettings()).toContain(
            getProviderSetting(provider, Setting.SURFACE_NAME).getLabel(),
        );
    });
});
