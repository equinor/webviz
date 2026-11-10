import { afterEach, describe, expect, test, vi } from "vitest";

import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import {
    SettingsContextDelegate,
    SettingsContextStatus,
} from "@modules/_shared/DataProviderFramework/delegates/SettingsContextDelegate";
import type {
    DataProviderManager,
    DataProviderManagerTopicPayload,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { SettingManager } from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import type { CustomSettingsHandler } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { DropdownStringSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/DropdownStringSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const SETTINGS = [Setting.SURFACE_NAME] as const;

// Just enough of a DataProviderManager for a SettingsContextDelegate without bindings.
function makeFakeDataProviderManager() {
    const publishSubscribeDelegate = new PublishSubscribeDelegate<DataProviderManagerTopicPayload>();
    const manager = {
        getPublishSubscribeDelegate: () => publishSubscribeDelegate,
        getGlobalSetting: () => null,
        getWorkbenchSession: () => null,
        getWorkbenchSettings: () => null,
        getQueryClient: () => null,
    } as unknown as DataProviderManager;

    return {
        manager,
        publishGlobalSettings: () =>
            publishSubscribeDelegate.notifySubscribers(DataProviderManagerTopic.GLOBAL_SETTINGS),
    };
}

function makeContext(defaultValue: string | null = null) {
    const setting = new SettingManager({
        type: Setting.SURFACE_NAME,
        label: "Surface Name",
        defaultValue,
        customSettingImplementation: new DropdownStringSetting(),
    });
    const handler: CustomSettingsHandler<typeof SETTINGS> = {
        settings: SETTINGS,
        setupBindings: () => {},
    };
    const { manager, publishGlobalSettings } = makeFakeDataProviderManager();
    const context = new SettingsContextDelegate<typeof SETTINGS>(handler, manager, {
        [Setting.SURFACE_NAME]: setting,
    });

    return { context, setting, publishGlobalSettings };
}

describe("SettingsContextDelegate status with persisted values", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("is LOADING while a persisted value waits for value constraints", () => {
        const { context, publishGlobalSettings } = makeContext();
        context.deserializeSettings({ [Setting.SURFACE_NAME]: JSON.stringify("A") }, () => {});

        publishGlobalSettings();

        expect(context.getStatus()).toBe(SettingsContextStatus.LOADING);
    });

    test("adopts a persisted value accepted by the value constraints", () => {
        const { context, setting } = makeContext();
        context.deserializeSettings({ [Setting.SURFACE_NAME]: JSON.stringify("A") }, () => {});

        setting.setValueConstraints(["A", "B"]);

        expect(context.getStatus()).toBe(SettingsContextStatus.VALID_SETTINGS);
        expect(setting.getValue()).toBe("A");
        expect(setting.isPersistedValue()).toBe(false);
    });

    test("is INVALID_SETTINGS when the value constraints reject the persisted value", () => {
        const { context, setting } = makeContext();
        context.deserializeSettings({ [Setting.SURFACE_NAME]: JSON.stringify("C") }, () => {});

        setting.setValueConstraints(["A", "B"]);

        expect(context.getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);
        expect(setting.isPersistedValue()).toBe(true);
    });

    test("is INVALID_SETTINGS when the persisted value failed to deserialize, even if the default is valid", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { context, setting } = makeContext("A");
        context.deserializeSettings({ [Setting.SURFACE_NAME]: "not json" }, () => {});

        setting.setValueConstraints(["A", "B"]);

        expect(setting.isValueValid()).toBe(true);
        expect(context.getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);
    });
});
