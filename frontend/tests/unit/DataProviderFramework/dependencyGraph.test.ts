import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderStatus } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findProvider,
    getProviderSetting,
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
        thickness: { "Top reservoir": [4, 5] },
    };
    backend.catalogues["field-b"] = {
        porosity: { "Mid reservoir": [7] },
    };
});

afterEach(() => {
    vi.useRealTimers();
});

async function restoreSurface(values: Parameters<typeof surfaceProvider>[1] = {}) {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    manager.deserializeState(managerState([surfaceProvider("Surface", values)]));
    await settle(manager);
    const provider = findProvider(manager, "Surface");
    return { manager, provider, setting: (key: Setting) => getProviderSetting(provider, key) };
}

describe("Dependency graph", () => {
    test("resolves each setting's allowed values through the graph, and picks the first one where nothing is persisted", async () => {
        const { provider, setting } = await restoreSurface();

        expect(setting(Setting.ATTRIBUTE).getValueConstraints()).toEqual(["depth", "thickness"]);
        expect(setting(Setting.ATTRIBUTE).getValue()).toBe("depth");
        expect(setting(Setting.SURFACE_NAME).getValueConstraints()).toEqual(["Top reservoir", "Base reservoir"]);
        expect(setting(Setting.SURFACE_NAME).getValue()).toBe("Top reservoir");
        expect(setting(Setting.REALIZATION).getValueConstraints()).toEqual([1, 2, 3]);
        expect(setting(Setting.REALIZATION).getValue()).toBe(1);
        expect(provider.getSettingsContextDelegate().getStoredData("surfaceCount")).toBe(2);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });

    test("requests everything once - no requests for intermediate values", async () => {
        await restoreSurface();

        expect(backend.calls).toEqual([
            { method: "getFieldCatalogue", args: ["field-a"] },
            { method: "getRealizations", args: ["field-a", "depth", "Top reservoir"] },
            { method: "getSurfaceData", args: ["field-a", "depth", "Top reservoir", 1] },
        ]);
    });

    test("restores persisted values that are only valid together, without requests for other values", async () => {
        const { setting } = await restoreSurface({
            attribute: "thickness",
            surfaceName: "Top reservoir",
            realization: 5,
        });

        expect(setting(Setting.ATTRIBUTE).getValue()).toBe("thickness");
        expect(setting(Setting.SURFACE_NAME).getValue()).toBe("Top reservoir");
        expect(setting(Setting.REALIZATION).getValue()).toBe(5);
        expect(backend.callsTo("getRealizations")).toEqual([["field-a", "thickness", "Top reservoir"]]);
        expect(backend.callsTo("getSurfaceData")).toEqual([["field-a", "thickness", "Top reservoir", 5]]);
    });

    test("changing a setting re-resolves what depends on it, and nothing upstream", async () => {
        const { manager, provider, setting } = await restoreSurface();

        setting(Setting.ATTRIBUTE).setValue("thickness");
        await settle(manager);

        expect(setting(Setting.SURFACE_NAME).getValueConstraints()).toEqual(["Top reservoir"]);
        expect(setting(Setting.SURFACE_NAME).getValue()).toBe("Top reservoir");
        expect(setting(Setting.REALIZATION).getValueConstraints()).toEqual([4, 5]);
        expect(provider.getSettingsContextDelegate().getStoredData("surfaceCount")).toBe(1);
        expect(backend.callsTo("getFieldCatalogue")).toHaveLength(1);
        expect(backend.callsTo("getRealizations")).toEqual([
            ["field-a", "depth", "Top reservoir"],
            ["field-a", "thickness", "Top reservoir"],
        ]);
    });

    test("attributes follow the settings they read, without re-resolving allowed values", async () => {
        const { manager, setting } = await restoreSurface();
        expect(setting(Setting.REALIZATION).getAttributes().enabled).toBe(true);
        const numCalls = backend.calls.length;

        setting(Setting.SHOW_LABELS).setValue(true);
        await settle(manager);

        expect(setting(Setting.REALIZATION).getAttributes().enabled).toBe(false);
        expect(backend.calls).toHaveLength(numCalls);
    });

    // What happens further down depends on how the now invalid values are fixed up - see the validity tests
    test("changing a global setting re-resolves the graph from its root", async () => {
        const { manager, setting } = await restoreSurface();

        manager.updateGlobalSetting("fieldId", "field-b");
        await settle(manager);

        expect(setting(Setting.ATTRIBUTE).getValueConstraints()).toEqual(["porosity"]);
        expect(backend.callsTo("getFieldCatalogue")).toEqual([["field-a"], ["field-b"]]);
    });

    test("a failing request leaves what depends on it without allowed values, until a change resolves it again", async () => {
        backend.failRequests("getRealizations");
        const { manager, provider, setting } = await restoreSurface();

        expect(setting(Setting.REALIZATION).getValueConstraints()).toBeNull();
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(backend.callsTo("getSurfaceData")).toHaveLength(0);

        backend.stopFailingRequests("getRealizations");
        setting(Setting.SURFACE_NAME).setValue("Base reservoir");
        await settle(manager);

        expect(setting(Setting.REALIZATION).getValueConstraints()).toEqual([1, 2]);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });
});
