import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { baseLinearSettings, defineBaseContinuousDependencies, fetchData, verifyBasePlotSettings } from "./_shared";

export const linearPlotSettings = [Setting.PLOT_VARIANT, ...baseLinearSettings] as const;
export type LinearPlotSettingTypes = typeof linearPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<LinearPlotSettingTypes>;

export class LinearPlotProvider
    implements CustomDataProviderImplementation<LinearPlotSettingTypes, WellboreLogCurveData_api>
{
    areCurrentSettingsValid = verifyBasePlotSettings<LinearPlotSettingTypes>;
    fetchData = fetchData<LinearPlotSettingTypes>;
    settings = linearPlotSettings;

    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<LinearPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["line", "linestep", "dot"];
        });
    }

    getDefaultName() {
        return "Linear plot";
    }

    // TODO: Figure out why prev-settings is undefined
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        // return !_.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
        return true;
    }
}
