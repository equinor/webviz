import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import _ from "lodash";

import { defineBaseContinuousDependencies, fetchData } from "./_shared";

// TODO: Need a clean way to
export const differentialPlotSettings = [Setting.LOG_CURVE, Setting.LOG_CURVE, Setting.SCALE] as const;
export type DifferentialPlotSettingTypes = typeof differentialPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<DifferentialPlotSettingTypes>;

export class DifferentialPlotProvider
    implements CustomDataProviderImplementation<DifferentialPlotSettingTypes, WellboreLogCurveData_api>
{
    defineDependencies = defineBaseContinuousDependencies;
    fetchData = fetchData;
    settings = differentialPlotSettings;

    getDefaultName() {
        return "Linear plot";
    }

    areCurrentSettingsValid() {
        // TODO
        return true;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        return _.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
    }
}
