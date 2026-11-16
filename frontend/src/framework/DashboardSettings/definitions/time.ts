import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { DashboardTimeSlider } from "../components/DashboardTimeSlider";
import { DashboardSettingRegistry } from "../DashboardSettingRegistry";
import { makeOptionListDashboardSettingOptions } from "../utils/optionListDashboardSetting";

// A point in time, as a UTC timestamp in milliseconds - consumers format their times differently (with
// or without time part or timezone), so they contribute and match timestamps rather than ISO strings
// (see `isoStringToTimestampUtcMs`).
export const TIME_DASHBOARD_SETTING = DashboardSettingRegistry.registerDashboardSetting({
    ...makeOptionListDashboardSettingOptions<number, number>({
        key: "time",
        label: "Time",
        getOptionValue: (timestampUtcMs) => timestampUtcMs,
        getOptionLabel: (timestampUtcMs) => timestampUtcMsToCompactIsoString(timestampUtcMs),
        compareOptions: (a, b) => a - b,
    }),
    Component: DashboardTimeSlider,
});
