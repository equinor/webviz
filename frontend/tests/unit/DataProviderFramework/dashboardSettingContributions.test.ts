import { describe, expect, test, vi } from "vitest";

import { DashboardSettingsService } from "@framework/DashboardSettings/DashboardSettingsService";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";
import {
    SettingManager,
    SettingTopic,
} from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import { TimeOrIntervalSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/TimeOrIntervalSetting";
import { makeTimePointDpfDashboardSettingAdapter } from "@modules/_shared/DataProviderFramework/settings/SettingRegistry/dashboardSettingAdapters";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

describe("Dashboard setting contributions", () => {
    test("are withdrawn while the setting is hidden, and restored once it is shown again", () => {
        const dashboardSettingsService = new DashboardSettingsService();
        const time = dashboardSettingsService.addSetting(TIME_DASHBOARD_SETTING);
        const setting = new SettingManager({
            type: Setting.TIME_POINT,
            label: "Time Point",
            defaultValue: null,
            customSettingImplementation: new TimeOrIntervalSetting(),
            dashboardSettingAdapter: makeTimePointDpfDashboardSettingAdapter(),
        });

        setting.setValueConstraints(["2018-01-01T00:00:00", "2019-01-01T00:00:00"]);
        setting.connectDashboardSettingsService(dashboardSettingsService);
        expect(time.getConstraints()).toEqual([Date.UTC(2018, 0, 1), Date.UTC(2019, 0, 1)]);

        setting.updateAttributes({ visible: false });
        expect(time.getConstraints()).toEqual([]);

        // A hidden setting still resolving its options must not hold the dashboard setting pending either
        setting.setLoading(true);
        expect(time.isSettling()).toBe(false);
        setting.setLoading(false);
        expect(time.getConstraints()).toEqual([]);

        setting.updateAttributes({ visible: true });
        expect(time.getConstraints()).toEqual([Date.UTC(2018, 0, 1), Date.UTC(2019, 0, 1)]);
    });

    test("leave an interval-only time setting editable, with its own value, while the dashboard time is active", () => {
        const dashboardSettingsService = new DashboardSettingsService();
        dashboardSettingsService.addSetting(TIME_DASHBOARD_SETTING);
        const setting = new SettingManager({
            type: Setting.TIME_OR_INTERVAL,
            label: "Time or Interval",
            defaultValue: null,
            customSettingImplementation: new TimeOrIntervalSetting(),
            dashboardSettingAdapter: makeTimePointDpfDashboardSettingAdapter(),
        });
        setting.connectDashboardSettingsService(dashboardSettingsService);
        const onDashboardControlledChange = vi.fn();
        setting.getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_DASHBOARD_CONTROLLED)(
            onDashboardControlledChange,
        );
        expect(setting.isDashboardControlled()).toBe(true);

        const firstInterval = "2018-01-01T00:00:00/2019-01-01T00:00:00";
        const secondInterval = "2019-01-01T00:00:00/2020-01-01T00:00:00";
        setting.setValueConstraints([firstInterval, secondInterval]);

        expect(setting.isDashboardControlled()).toBe(false);
        expect(onDashboardControlledChange).toHaveBeenCalled();
        expect(setting.getValue()).toBe(firstInterval);

        setting.setValue(secondInterval);
        expect(setting.getValue()).toBe(secondInterval);
        expect(setting.isDashboardControlled()).toBe(false);
    });
});
