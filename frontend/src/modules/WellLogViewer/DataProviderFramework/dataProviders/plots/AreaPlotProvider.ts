import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { baseLinearSettings, defineBaseContinuousDependencies, fetchData, verifyBasePlotSettings } from "./_shared";

export const AreaPlotSettings = [Setting.PLOT_VARIANT, ...baseLinearSettings, Setting.COLOR_SCALE] as const;
export type AreaPlotSettingTypes = typeof AreaPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<AreaPlotSettingTypes>;

export class AreaPlotProvider
    implements CustomDataProviderImplementation<AreaPlotSettingTypes, WellboreLogCurveData_api>
{
    areCurrentSettingsValid = verifyBasePlotSettings<AreaPlotSettingTypes>;
    fetchData = fetchData<AreaPlotSettingTypes>;
    settings = AreaPlotSettings;

    defineDependencies(args: DefineDependenciesArgs<AreaPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["area", "gradientfill"];
        });
    }

    getDefaultName() {
        return "Area plot";
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        return true;
        // return _.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
    }
}
