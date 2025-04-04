import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataLayerImplementation } from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import { baseLinearSettings, defineDependencies, fetchData } from "./_shared";

export const AreaPlotSettings = [...baseLinearSettings, Setting.PLOT_VARIANT, Setting.COLOR_SCALE] as const;
export type AreaPlotSettingTypes = typeof AreaPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<AreaPlotSettingTypes>;

export class AreaPlotProvider implements CustomDataLayerImplementation<AreaPlotSettingTypes, WellboreLogCurveData_api> {
    settings = AreaPlotSettings;

    // Uses the same external things as the other types
    fetchData = fetchData<AreaPlotSettingTypes>;
    defineDependencies(args: DefineDependenciesArgs<AreaPlotSettingTypes>) {
        defineDependencies<AreaPlotSettingTypes>(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["area", "gradientfill"];
        });
    }

    getDefaultName() {
        return "Area plot";
    }

    areCurrentSettingsValid() {
        // TODO
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        return true;
        // return _.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
    }
}
