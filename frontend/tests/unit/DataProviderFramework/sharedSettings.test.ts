import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ContextBoundary } from "@modules/_shared/DataProviderFramework/framework/ContextBoundary/ContextBoundary";
import { DataProviderStatus } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import {
    type SettingManager,
    SettingTopic,
} from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import type { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    boundary,
    findItem,
    findProvider,
    getProviderSetting,
    makeDataProviderManager,
    managerState,
    settle,
    sharedSetting,
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

// What the settings UI shows
function isControlled(setting: SettingManager<any>): boolean {
    return setting.makeSnapshotGetter(SettingTopic.IS_EXTERNALLY_CONTROLLED)() as boolean;
}

describe("Shared settings", () => {
    test("allow the values all controlled providers allow, and the providers load with the shared value - once", async () => {
        const manager = await restore(
            sharedSetting("Shared surface name", Setting.SURFACE_NAME),
            surfaceProvider("Depth surface", { attribute: "depth" }),
            surfaceProvider("Thickness surface", { attribute: "thickness" }),
        );
        const shared = findItem<SharedSetting<Setting.SURFACE_NAME>>(manager, "Shared surface name");
        const depthSurface = findProvider(manager, "Depth surface");
        const thicknessSurface = findProvider(manager, "Thickness surface");

        expect(shared.getWrappedSetting().getValueConstraints()).toEqual(["Top reservoir"]);
        expect(shared.getWrappedSetting().getValue()).toBe("Top reservoir");
        expect(isControlled(getProviderSetting(depthSurface, Setting.SURFACE_NAME))).toBe(true);
        expect(getProviderSetting(depthSurface, Setting.SURFACE_NAME).getValue()).toBe("Top reservoir");
        expect(getProviderSetting(thicknessSurface, Setting.SURFACE_NAME).getValue()).toBe("Top reservoir");
        expect(backend.callsTo("getSurfaceData")).toHaveLength(2);
        expect(backend.callsTo("getSurfaceData")).toEqual(
            expect.arrayContaining([
                ["field-a", "depth", "Top reservoir", 1],
                ["field-a", "thickness", "Top reservoir", 4],
            ]),
        );
    });

    // Shared settings are always placed before the other items of their level (the UI doesn't allow moving anything
    // above them either), so the order the items were saved in doesn't matter
    test("control every provider on their level, wherever it was saved", async () => {
        const manager = await restore(
            surfaceProvider("Saved before", { attribute: "depth", surfaceName: "Base reservoir" }),
            sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Top reservoir"),
            surfaceProvider("Saved after", { attribute: "depth" }),
        );

        for (const name of ["Saved before", "Saved after"]) {
            const surfaceName = getProviderSetting(findProvider(manager, name), Setting.SURFACE_NAME);
            expect(isControlled(surfaceName)).toBe(true);
            expect(surfaceName.getValue()).toBe("Top reservoir");
        }
    });

    test("pass a restored value on to the providers they control, instead of the providers' own values", async () => {
        const manager = await restore(
            sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
            surfaceProvider("Surface", { attribute: "depth", surfaceName: "Top reservoir" }),
        );

        expect(getProviderSetting(findProvider(manager, "Surface"), Setting.SURFACE_NAME).getValue()).toBe(
            "Base reservoir",
        );
        expect(backend.callsTo("getSurfaceData")).toEqual([["field-a", "depth", "Base reservoir", 1]]);
    });

    test("with two shared settings of the same type on one level, the first controls the second, which passes the value on", async () => {
        const manager = await restore(
            sharedSetting("First shared surface name", Setting.SURFACE_NAME, "Top reservoir"),
            surfaceProvider("First surface", { attribute: "depth" }),
            sharedSetting("Second shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
            surfaceProvider("Second surface", { attribute: "depth" }),
        );
        const second = findItem<SharedSetting<Setting.SURFACE_NAME>>(manager, "Second shared surface name");

        expect(isControlled(second.getWrappedSetting())).toBe(true);
        expect(getProviderSetting(findProvider(manager, "First surface"), Setting.SURFACE_NAME).getValue()).toBe(
            "Top reservoir",
        );
        expect(getProviderSetting(findProvider(manager, "Second surface"), Setting.SURFACE_NAME).getValue()).toBe(
            "Top reservoir",
        );
    });

    test("release the providers when removed - they keep the shared value, without refetching", async () => {
        const manager = await restore(
            sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
            surfaceProvider("Surface", { attribute: "depth" }),
        );
        const shared = findItem<SharedSetting<Setting.SURFACE_NAME>>(manager, "Shared surface name");
        const surfaceName = getProviderSetting(findProvider(manager, "Surface"), Setting.SURFACE_NAME);

        manager.getGroupDelegate().removeChild(shared);
        shared.beforeDestroy();
        await settle(manager);

        expect(isControlled(surfaceName)).toBe(false);
        expect(surfaceName.getValue()).toBe("Base reservoir");
        expect(backend.callsTo("getSurfaceData")).toHaveLength(1);
    });

    test("isExternallyControlled() reports a setting controlled by a shared setting as controlled", async () => {
        const manager = await restore(
            sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
            surfaceProvider("Surface", { attribute: "depth" }),
        );

        expect(
            getProviderSetting(findProvider(manager, "Surface"), Setting.SURFACE_NAME).isExternallyControlled(),
        ).toBe(true);
    });
});

describe("Context boundaries", () => {
    test("keep a shared setting inside them from controlling the items outside", async () => {
        const manager = await restore(
            boundary("Boundary", [
                sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
                surfaceProvider("Inside", { attribute: "depth" }),
            ]),
            surfaceProvider("Outside", { attribute: "depth", surfaceName: "Top reservoir" }),
        );

        expect(getProviderSetting(findProvider(manager, "Inside"), Setting.SURFACE_NAME).getValue()).toBe(
            "Base reservoir",
        );
        expect(getProviderSetting(findProvider(manager, "Outside"), Setting.SURFACE_NAME).getValue()).toBe(
            "Top reservoir",
        );
    });

    test("a provider moved into a boundary follows the shared setting there, and is released when moved out again", async () => {
        const manager = await restore(
            boundary("Boundary", [sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir")]),
            surfaceProvider("Surface", { attribute: "depth", surfaceName: "Top reservoir" }),
        );
        const boundaryGroup = findItem<ContextBoundary>(manager, "Boundary").getGroupDelegate();
        const provider = findProvider(manager, "Surface");
        const surfaceName = getProviderSetting(provider, Setting.SURFACE_NAME);
        expect(isControlled(surfaceName)).toBe(false);

        // The same calls as moving the provider in the settings UI
        manager.getGroupDelegate().removeChild(provider);
        boundaryGroup.insertChild(provider, 1);
        await settle(manager);
        expect(isControlled(surfaceName)).toBe(true);
        expect(surfaceName.getValue()).toBe("Base reservoir");

        boundaryGroup.removeChild(provider);
        manager.getGroupDelegate().insertChild(provider, 1);
        await settle(manager);
        expect(isControlled(surfaceName)).toBe(false);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });

    test("don't stop a shared setting before them from controlling the items inside", async () => {
        const manager = await restore(
            sharedSetting("Shared surface name", Setting.SURFACE_NAME, "Base reservoir"),
            boundary("Boundary", [surfaceProvider("Inside", { attribute: "depth" })]),
        );

        expect(getProviderSetting(findProvider(manager, "Inside"), Setting.SURFACE_NAME).getValue()).toBe(
            "Base reservoir",
        );
    });
});
