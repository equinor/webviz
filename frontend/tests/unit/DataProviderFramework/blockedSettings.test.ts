import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderStatus } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import type { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { SerializedDataProvider } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findItem,
    findProvider,
    getProviderSetting,
    getTestBackend,
    makeDataProviderManager,
    managerState,
    settle,
    sharedSetting,
    surfaceProvider,
    type TestBackend,
    resetTestBackend,
} from "../../utils/dataProviderFramework";

const HIDEABLE_SETTINGS = [Setting.SHOW_LABELS, Setting.SURFACE_NAME, Setting.REALIZATION] as const;
const HIDEABLE_SURFACE_NAME_PROVIDER_TYPE = "test-hideable-surface-name-provider";

/*
 * A provider whose REALIZATION is resolved from a setting that can be hidden:
 *   global fieldId -> SURFACE_NAME allowed values (the "depth" surfaces)
 *   SHOW_LABELS -> SURFACE_NAME attributes (only shown along with the labels)
 *   fieldId + SURFACE_NAME -> REALIZATION allowed values
 */
class HideableSurfaceNameProvider implements CustomDataProviderImplementation<typeof HIDEABLE_SETTINGS, null> {
    settings = HIDEABLE_SETTINGS;

    getDefaultName(): string {
        return "Hideable surface name";
    }

    setupBindings({ setting }: SetupBindingsContext<typeof HIDEABLE_SETTINGS>) {
        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return { fieldId: read.globalSetting("fieldId") };
            },
            async resolve({ fieldId }) {
                const catalogue = await getTestBackend().getFieldCatalogue(fieldId);
                return Object.keys(catalogue?.["depth"] ?? {});
            },
        });
        setting(Setting.SURFACE_NAME).bindAttributes({
            read(read) {
                return { showLabels: read.localSetting(Setting.SHOW_LABELS) };
            },
            resolve({ showLabels }) {
                return { visible: showLabels === true };
            },
        });
        setting(Setting.REALIZATION).bindValueConstraints({
            read(read) {
                return {
                    fieldId: read.globalSetting("fieldId"),
                    surfaceName: read.localSetting(Setting.SURFACE_NAME),
                };
            },
            resolve({ fieldId, surfaceName }) {
                return getTestBackend().getRealizations(fieldId, "depth", surfaceName);
            },
        });
    }

    fetchData(): Promise<null> {
        return Promise.resolve(null);
    }
}

DataProviderRegistry.registerDataProvider(HIDEABLE_SURFACE_NAME_PROVIDER_TYPE, HideableSurfaceNameProvider);

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
});

afterEach(() => {
    vi.useRealTimers();
});

async function restore(fieldId: string, ...items: Parameters<typeof managerState>[0]) {
    const manager = makeDataProviderManager({ fieldId });
    manager.deserializeState(managerState(items));
    await settle(manager);
    return manager;
}

/*
 * A setting whose allowed values are resolved from an invalid (or itself blocked) setting is blocked: nothing is
 * requested for the selection that can't be used, and it keeps its value until it can be resolved again.
 */
describe("Blocked settings", () => {
    test("block every setting below an invalid one, naming what each waits for, and request nothing for it", async () => {
        const manager = await restore(
            "field-b",
            surfaceProvider("Surface", { attribute: "porosity", surfaceName: "Mid reservoir", realization: 7 }),
        );
        const provider = findProvider(manager, "Surface");
        const attribute = getProviderSetting(provider, Setting.ATTRIBUTE);
        const surfaceName = getProviderSetting(provider, Setting.SURFACE_NAME);
        const realization = getProviderSetting(provider, Setting.REALIZATION);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);

        // field-a has no porosity surfaces
        manager.updateGlobalSetting("fieldId", "field-a");
        await settle(manager);

        expect(attribute.getValue()).toBe("porosity");
        expect(attribute.isValueValid()).toBe(false);
        expect(attribute.isBlocked()).toBe(false);
        expect(surfaceName.getValue()).toBe("Mid reservoir");
        expect(surfaceName.isBlocked()).toBe(true);
        expect(surfaceName.getBlockedBy()).toEqual([attribute.getLabel()]);
        expect(realization.getValue()).toBe(7);
        expect(realization.isBlocked()).toBe(true);
        expect(realization.getBlockedBy()).toEqual([attribute.getLabel(), surfaceName.getLabel()]);
        expect(backend.callsTo("getRealizations")).not.toContainEqual(["field-a", "porosity", "Mid reservoir"]);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(provider.getSettingsContextDelegate().getInvalidSettings()).toEqual([attribute.getLabel()]);

        // Only the setting right below the now valid one resolves - the next one waits for that one alone
        attribute.setValue("depth");
        await settle(manager);

        expect(surfaceName.isBlocked()).toBe(false);
        expect(surfaceName.getValue()).toBe("Mid reservoir");
        expect(surfaceName.isValueValid()).toBe(false);
        expect(realization.isBlocked()).toBe(true);
        expect(realization.getBlockedBy()).toEqual([surfaceName.getLabel()]);

        // Resolved again, the kept realization is judged by the allowed values of the chosen surface
        surfaceName.setValue("Top reservoir");
        await settle(manager);

        expect(realization.isBlocked()).toBe(false);
        expect(realization.getValue()).toBe(7);
        expect(realization.isValueValid()).toBe(false);
        expect(provider.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
    });

    test("are not blocked by a hidden setting, as it does not apply", async () => {
        const hideableSurfaceNameProvider: SerializedDataProvider<any> = {
            ...surfaceProvider("Provider", { showLabels: true, surfaceName: "Top reservoir", realization: 1 }),
            dataProviderType: HIDEABLE_SURFACE_NAME_PROVIDER_TYPE,
        };
        const manager = await restore("field-a", hideableSurfaceNameProvider);
        const provider = findProvider(manager, "Provider");
        const showLabels = getProviderSetting(provider, Setting.SHOW_LABELS);
        const surfaceName = getProviderSetting(provider, Setting.SURFACE_NAME);
        const realization = getProviderSetting(provider, Setting.REALIZATION);

        manager.updateGlobalSetting("fieldId", "field-b");
        await settle(manager);

        expect(surfaceName.isValueValid()).toBe(false);
        expect(realization.isBlocked()).toBe(true);

        showLabels.setValue(false);
        await settle(manager);

        expect(surfaceName.getAttributes().visible).toBe(false);
        expect(realization.isBlocked()).toBe(false);

        // Shown again, it blocks again
        showLabels.setValue(true);
        await settle(manager);

        expect(realization.isBlocked()).toBe(true);
        expect(realization.getBlockedBy()).toEqual([surfaceName.getLabel()]);
    });

    test("block a shared setting while a provider it controls can't resolve its allowed values", async () => {
        const manager = await restore(
            "field-a",
            sharedSetting("Shared surface name", Setting.SURFACE_NAME),
            surfaceProvider("Gone attribute surface", { attribute: "gone" }),
            surfaceProvider("Depth surface", { attribute: "depth" }),
        );
        const shared = findItem<SharedSetting<Setting.SURFACE_NAME>>(manager, "Shared surface name").getWrappedSetting();
        const goneAttributeSurface = findProvider(manager, "Gone attribute surface");
        const depthSurface = findProvider(manager, "Depth surface");
        const goneAttribute = getProviderSetting(goneAttributeSurface, Setting.ATTRIBUTE);

        expect(shared.isBlocked()).toBe(true);
        expect(shared.getBlockedBy()).toEqual([goneAttribute.getLabel()]);
        // The other provider waits along with the shared setting - settled, rather than loading for good
        expect(getProviderSetting(depthSurface, Setting.SURFACE_NAME).isBlocked()).toBe(true);
        expect(depthSurface.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);
        expect(goneAttributeSurface.getStatus()).toBe(DataProviderStatus.INVALID_SETTINGS);

        goneAttribute.setValue("depth");
        await settle(manager);

        expect(shared.isBlocked()).toBe(false);
        expect(shared.getValueConstraints()).toEqual(["Top reservoir", "Base reservoir"]);
        expect(goneAttributeSurface.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(depthSurface.getStatus()).toBe(DataProviderStatus.SUCCESS);
    });
});
