import type { WellborePick_api } from "@api";
import { getWellborePicksInStratColumnOptions, getWellboreStratigraphicColumnsOptions } from "@api";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import _ from "lodash";

export const wellPickSettings = [Setting.STRAT_COLUMN, Setting.SMDA_INTERPRETER, Setting.WELL_PICKS] as const;
export type WellPickSettingTypes = typeof wellPickSettings;
type SettingsTypeMap = MakeSettingTypesMap<WellPickSettingTypes>;

export class WellborePicksProvider implements CustomDataLayerImplementation<WellPickSettingTypes, WellborePick_api[]> {
    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<WellPickSettingTypes>) {
        const { helperDependency, availableSettingsUpdater, queryClient } = args;

        const columnOptions = helperDependency(({ getGlobalSetting, abortSignal }) => {
            const wellboreUuid = getGlobalSetting("wellboreUuid");

            if (!wellboreUuid) return null;

            return queryClient.fetchQuery({
                ...getWellboreStratigraphicColumnsOptions({
                    query: { wellbore_uuid: wellboreUuid },
                    signal: abortSignal,
                }),
            });
        });

        const wellPickOptions = helperDependency(({ getGlobalSetting, getLocalSetting, abortSignal }) => {
            const wellboreUuid = getGlobalSetting("wellboreUuid");
            const stratColumn = getLocalSetting(Setting.STRAT_COLUMN);

            if (!wellboreUuid || !stratColumn) return null;

            return queryClient.fetchQuery({
                ...getWellborePicksInStratColumnOptions({
                    query: { wellbore_uuid: wellboreUuid, strat_column: stratColumn },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.STRAT_COLUMN, ({ getHelperDependency }) => {
            const columns = getHelperDependency(columnOptions);

            if (!columns) return [];
            return _.map(columns, "identifier");
        });

        availableSettingsUpdater(Setting.SMDA_INTERPRETER, ({ getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);

            if (!wellPicks) return [];

            const picksByInterpreter = _.groupBy(wellPicks, "interpreter");

            return _.keys(picksByInterpreter);
        });

        availableSettingsUpdater(Setting.WELL_PICKS, ({ getLocalSetting, getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);
            // const pickUnits = getHelperDependency(wellPickUnits);
            const interpreter = getLocalSetting(Setting.SMDA_INTERPRETER);

            if (!wellPicks || !interpreter) return [];

            return _.filter(wellPicks, ["interpreter", interpreter]);
        });
    }

    settings = wellPickSettings;

    fetchData(args: FetchDataParams<WellPickSettingTypes, WellborePick_api[]>): Promise<WellborePick_api[]> {
        const { getSetting } = args;

        const chosenWellPicks = getSetting(Setting.WELL_PICKS);

        // ! Not actually any reason for this to be a promise. No data to fetch, it's already available in the well-picks
        return new Promise((resolve) => {
            resolve(chosenWellPicks ?? []);
        });
    }

    getDefaultName() {
        return "Wellbore picks";
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    areCurrentSettingsValid(accessor: DataLayerInformationAccessors<WellPickSettingTypes, WellborePick_api[]>) {
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
