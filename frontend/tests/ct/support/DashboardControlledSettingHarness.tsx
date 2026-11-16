import React from "react";

import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";
import { SettingManager } from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManager";
import { SettingManagerComponent } from "@modules/_shared/DataProviderFramework/framework/SettingManager/SettingManagerComponent";
import { TimeOrIntervalSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/TimeOrIntervalSetting";
import { makeTimePointDpfDashboardSettingAdapter } from "@modules/_shared/DataProviderFramework/settings/SettingRegistry/dashboardSettingAdapters";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { makeDataProviderManager } from "../../utils/dataProviderFramework/manager";

type Props = {
    // Blocks the setting (as when a setting it depends on is invalid) after it has resolved its options
    blocked: boolean;
};

/**
 * Browser-side harness rendering a DPF time point setting that is controlled by the dashboard time, with a
 * dashboard value its own options don't contain.
 */
export function DashboardControlledSettingHarness(props: Props): React.JSX.Element {
    const [{ manager, setting }] = React.useState(() => {
        const manager = makeDataProviderManager();
        const dashboardSettingsService = manager.getDashboardSettingsService();
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
        time.setValue(Date.UTC(2020, 0, 1));

        if (props.blocked) {
            setting.setBlocked(true, ["Ensemble"]);
        }

        return { manager, setting };
    });

    return <SettingManagerComponent setting={setting} manager={manager} sharedSetting={false} />;
}
