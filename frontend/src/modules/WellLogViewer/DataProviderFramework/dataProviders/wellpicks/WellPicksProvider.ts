import type { WellborePick_api } from "@api";
import { getWellborePicksInStratColumnOptions, getWellboreStratigraphicColumnsOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import _ from "lodash";

export const wellPickSettings = [Setting.STRAT_COLUMN, Setting.SMDA_INTERPRETER, Setting.WELL_PICKS] as const;
export type WellPickSettingTypes = typeof wellPickSettings;
type SettingsTypeMap = MakeSettingTypesMap<WellPickSettingTypes>;

export class WellborePicksProvider
    implements CustomDataProviderImplementation<WellPickSettingTypes, WellborePick_api[]>
{
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

    areCurrentSettingsValid(accessor: DataProviderInformationAccessors<WellPickSettingTypes, WellborePick_api[]>) {
        return accessor.getSetting(Setting.STRAT_COLUMN) != null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        // TODO: Refetch if wellbore changed, which is a global value
        return true;
        // return prevSettings?.stratColumn !== newSettings?.stratColumn;
    }
}
