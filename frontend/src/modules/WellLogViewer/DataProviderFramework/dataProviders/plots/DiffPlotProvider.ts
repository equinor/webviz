import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { baseLinearSettings, defineBaseContinuousDependencies, fetchData } from "./_shared";

export const differentialPlotSettings = [...baseLinearSettings] as const;
export type DiffPlotSettingTypes = typeof differentialPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<DiffPlotSettingTypes>;

export class DiffPlotProvider
    implements CustomDataProviderImplementation<DiffPlotSettingTypes, WellboreLogCurveData_api>
{
    defineDependencies = defineBaseContinuousDependencies<DiffPlotSettingTypes>;
    fetchData = fetchData<DiffPlotSettingTypes>;
    settings = differentialPlotSettings;

    getDefaultName() {
        return "Differential plot";
    }

    areCurrentSettingsValid() {
        // TODO
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        // return _.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
        return true;
    }
}
