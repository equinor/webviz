import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import {
    type SettingManager,
    SettingTopic,
} from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { SerializedDataProvider } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { SerializedType } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    filterProvider,
    findProvider,
    getProviderSetting,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    type TestBackend,
} from "../../utils/dataProviderFramework";

const FAILING_ATTRIBUTES_SETTINGS = [Setting.SHOW_LABELS, Setting.SURFACE_NAME] as const;

// Its attributes resolver fails - as with a bug in a provider implementation
class FailingAttributesProvider implements CustomDataProviderImplementation<
    typeof FAILING_ATTRIBUTES_SETTINGS,
    string
> {
    settings = FAILING_ATTRIBUTES_SETTINGS;

    getDefaultName(): string {
        return "Failing attributes provider";
    }

    setupBindings({ setting }: SetupBindingsContext<typeof FAILING_ATTRIBUTES_SETTINGS>): void {
        setting(Setting.SURFACE_NAME).bindAttributes({
            read(read) {
                return { showLabels: read.localSetting(Setting.SHOW_LABELS) };
            },
            resolve() {
                throw new Error("Attributes resolver failed");
            },
        });
    }

    async fetchData(): Promise<string> {
        return "data";
    }
}

// The same, but its attributes resolver depends on another binding - which makes it wait for that one to resolve first
class FailingDependentAttributesProvider implements CustomDataProviderImplementation<
    typeof FAILING_ATTRIBUTES_SETTINGS,
    string
> {
    settings = FAILING_ATTRIBUTES_SETTINGS;

    getDefaultName(): string {
        return "Failing dependent attributes provider";
    }

    setupBindings({ setting, makeSharedResult }: SetupBindingsContext<typeof FAILING_ATTRIBUTES_SETTINGS>): void {
        const fieldIdDep = makeSharedResult({
            debugName: "FieldId",
            read(read) {
                return { fieldId: read.globalSetting("fieldId") };
            },
            async resolve({ fieldId }) {
                return fieldId;
            },
        });

        setting(Setting.SURFACE_NAME).bindAttributes({
            read(read) {
                return { fieldId: read.sharedResult(fieldIdDep) };
            },
            resolve() {
                throw new Error("Attributes resolver failed");
            },
        });
    }

    async fetchData(): Promise<string> {
        return "data";
    }
}

DataProviderRegistry.registerDataProvider("failing-attributes-test-provider", FailingAttributesProvider);
DataProviderRegistry.registerDataProvider(
    "failing-dependent-attributes-test-provider",
    FailingDependentAttributesProvider,
);

function makeSerializedProvider(name: string, dataProviderType: string): SerializedDataProvider<any> {
    return {
        id: name,
        type: SerializedType.DATA_PROVIDER,
        name,
        expanded: true,
        visible: true,
        dataProviderType,
        settings: {},
    };
}

// Whether the setting component would show the setting
function isShown(setting: SettingManager<any>): boolean {
    return setting.areAttributesResolved() && setting.getAttributes().visible;
}

function recordWhetherShown(setting: SettingManager<any>): boolean[] {
    const record = [isShown(setting)];
    const recordChange = () => record.push(isShown(setting));
    setting.getPublishSubscribeDelegate().subscribe(SettingTopic.ATTRIBUTES, recordChange);
    setting.getPublishSubscribeDelegate().subscribe(SettingTopic.ARE_ATTRIBUTES_RESOLVED, recordChange);
    return record;
}

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = { depth: { "Top reservoir": [1] } };
});

afterEach(() => {
    vi.useRealTimers();
});

describe("Setting attributes", () => {
    test("a setting that ends up hidden is never shown while its attributes are being resolved", async () => {
        backend.delayMs = 100;
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));
        const surfaceName = getProviderSetting(findProvider(manager, "Filter"), Setting.SURFACE_NAME);
        const shown = recordWhetherShown(surfaceName);

        await vi.advanceTimersByTimeAsync(50);
        expect(surfaceName.areAttributesResolved()).toBe(false);

        await settle(manager);
        expect(surfaceName.areAttributesResolved()).toBe(true);
        expect(shown).not.toContain(true);
    });

    test("a setting that ends up shown appears once its attributes are resolved", async () => {
        backend.delayMs = 100;
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter", { showLabels: true })]));
        const surfaceName = getProviderSetting(findProvider(manager, "Filter"), Setting.SURFACE_NAME);

        await vi.advanceTimersByTimeAsync(50);
        expect(isShown(surfaceName)).toBe(false);

        await settle(manager);
        expect(isShown(surfaceName)).toBe(true);
    });

    test("a setting without attribute bindings is resolved from the start", () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));

        expect(getProviderSetting(findProvider(manager, "Filter"), Setting.SHOW_LABELS).areAttributesResolved()).toBe(
            true,
        );
    });

    test("a setting whose attributes resolver fails is shown with the default attributes", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([makeSerializedProvider("Failing", "failing-attributes-test-provider")]));
        await vi.advanceTimersByTimeAsync(20);

        const surfaceName = getProviderSetting(findProvider(manager, "Failing"), Setting.SURFACE_NAME);
        expect(surfaceName.areAttributesResolved()).toBe(true);
        expect(surfaceName.getAttributes()).toEqual({ visible: true, enabled: true });
    });

    test("a setting whose attributes resolver fails after waiting for another binding is shown as well", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(
            managerState([makeSerializedProvider("Failing", "failing-dependent-attributes-test-provider")]),
        );
        await vi.advanceTimersByTimeAsync(20);

        const surfaceName = getProviderSetting(findProvider(manager, "Failing"), Setting.SURFACE_NAME);
        expect(surfaceName.areAttributesResolved()).toBe(true);
        expect(surfaceName.getAttributes()).toEqual({ visible: true, enabled: true });
    });
});
