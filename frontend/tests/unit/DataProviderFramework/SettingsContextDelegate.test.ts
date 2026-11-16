import { afterEach, describe, expect, test, vi } from "vitest";

import { DashboardSettingsService } from "@framework/DashboardSettings/DashboardSettingsService";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
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
import { DropdownNumberSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/DropdownNumberSetting";
import { DropdownStringSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/DropdownStringSetting";
import { makeIdentityDpfDashboardSettingAdapter } from "@modules/_shared/DataProviderFramework/settings/SettingRegistry/dashboardSettingAdapters";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const SETTINGS = [Setting.SURFACE_NAME] as const;
const REALIZATION_SETTINGS = [Setting.REALIZATION] as const;

// Just enough of a DataProviderManager for a SettingsContextDelegate without bindings.
function makeFakeDataProviderManager(dashboardSettingsService = new DashboardSettingsService()) {
    const publishSubscribeDelegate = new PublishSubscribeDelegate<DataProviderManagerTopicPayload>();
    const manager = {
        getPublishSubscribeDelegate: () => publishSubscribeDelegate,
        getGlobalSetting: () => null,
        getWorkbenchSession: () => null,
        getWorkbenchSettings: () => null,
        getDashboardSettingsService: () => dashboardSettingsService,
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

function makeRealizationContext(dashboardSettingsService: DashboardSettingsService) {
    const setting = new SettingManager({
        type: Setting.REALIZATION,
        label: "Realization",
        defaultValue: null,
        customSettingImplementation: new DropdownNumberSetting(),
        dashboardSettingAdapter: makeIdentityDpfDashboardSettingAdapter(REALIZATION_DASHBOARD_SETTING),
    });
    const handler: CustomSettingsHandler<typeof REALIZATION_SETTINGS> = {
        settings: REALIZATION_SETTINGS,
        setupBindings: () => {},
    };
    const { manager } = makeFakeDataProviderManager(dashboardSettingsService);
    const context = new SettingsContextDelegate<typeof REALIZATION_SETTINGS>(handler, manager, {
        [Setting.REALIZATION]: setting,
    });

    return { context, setting };
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

    test("ignores a rejected persisted local value while the dashboard setting controls the setting", () => {
        const dashboardSettingsService = new DashboardSettingsService();
        const { context, setting } = makeRealizationContext(dashboardSettingsService);
        context.deserializeSettings({ [Setting.REALIZATION]: JSON.stringify(3) }, () => {});
        setting.setValueConstraints([1, 2]);
        expect(context.getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);

        dashboardSettingsService.addSetting(REALIZATION_DASHBOARD_SETTING);

        expect(setting.isDashboardControlled()).toBe(true);
        expect(context.getStatus()).toBe(SettingsContextStatus.VALID_SETTINGS);
        expect(context.getValues()[Setting.REALIZATION]).toBe(1);
        expect(setting.isPersistedValue()).toBe(true);
        expect(setting.getLocalInternalValue()).toBe(3);

        dashboardSettingsService.removeSetting(REALIZATION_DASHBOARD_SETTING);

        expect(context.getStatus()).toBe(SettingsContextStatus.INVALID_SETTINGS);
        expect(context.getValues()[Setting.REALIZATION]).toBeUndefined();
        expect(setting.getLocalInternalValue()).toBe(3);
    });

    test("persists the local value while the dashboard setting controls the setting, and returns to it once removed", () => {
        const dashboardSettingsService = new DashboardSettingsService();
        const { context, setting } = makeRealizationContext(dashboardSettingsService);
        setting.setValueConstraints([1, 2, 3]);
        setting.setValue(3);

        const realization = dashboardSettingsService.addSetting(REALIZATION_DASHBOARD_SETTING);
        realization.setValue(2);

        expect(setting.isDashboardControlled()).toBe(true);
        expect(context.getValues()[Setting.REALIZATION]).toBe(2);
        expect(context.serializeSettings()[Setting.REALIZATION]).toBe(JSON.stringify(3));

        dashboardSettingsService.removeSetting(REALIZATION_DASHBOARD_SETTING);

        expect(setting.isDashboardControlled()).toBe(false);
        expect(context.getValues()[Setting.REALIZATION]).toBe(3);
        expect(context.serializeSettings()[Setting.REALIZATION]).toBe(JSON.stringify(3));
    });
});
