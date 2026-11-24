import { DashboardSettingRegistry } from "../DashboardSettingRegistry";
import { makeOptionListDashboardSettingOptions } from "../utils/optionListDashboardSetting";

export const REALIZATION_DASHBOARD_SETTING = DashboardSettingRegistry.registerDashboardSetting(
    makeOptionListDashboardSettingOptions<number, number>({
        key: "realization",
        label: "Realization",
        getOptionValue: (realization) => realization,
        getOptionLabel: (realization) => realization.toString(),
        compareOptions: (a, b) => a - b,
    }),
);
