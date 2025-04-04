import type { WellboreLogCurveData_api } from "@api";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import { baseLinearSettings, defineDependencies, fetchData } from "./_shared";

export const linearPlotSettings = [...baseLinearSettings, Setting.PLOT_VARIANT, Setting.COLOR] as const;
export type LinearPlotSettingTypes = typeof linearPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<LinearPlotSettingTypes>;

export class LinearPlotProvider
    implements CustomDataLayerImplementation<LinearPlotSettingTypes, WellboreLogCurveData_api>
{
    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<LinearPlotSettingTypes>) {
        defineDependencies(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["line", "linestep", "dot"];
        });
    }
    fetchData = fetchData<LinearPlotSettingTypes>;
    settings = linearPlotSettings;

    getDefaultName() {
        return "Linear plot";
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    areCurrentSettingsValid(accessor: DataLayerInformationAccessors<LinearPlotSettingTypes, WellboreLogCurveData_api>) {
        // TODO

        return true;
    }

    // TODO: Figure out why prev-settings is undefined
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        // return !_.isEqual(prevSettings?.logCurve, newSettings?.logCurve);
        return true;
    }
}
