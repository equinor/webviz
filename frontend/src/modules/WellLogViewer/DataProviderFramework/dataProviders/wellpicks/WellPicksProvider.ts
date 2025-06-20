import { filter, groupBy, isEqual, keys, map } from "lodash";

import type { WellborePick_api } from "@api";
import { getWellborePicksInStratColumnOptions, getWellboreStratigraphicColumnsOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

export const wellPickSettings = [Setting.STRAT_COLUMN, Setting.SMDA_INTERPRETER, Setting.WELLBORE_PICKS] as const;
export type WellPickSettingTypes = typeof wellPickSettings;
type SettingsTypeMap = MakeSettingTypesMap<WellPickSettingTypes>;

export class WellborePicksProvider
    implements CustomDataProviderImplementation<WellPickSettingTypes, WellborePick_api[]>
{
    settings = wellPickSettings;

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
                    query: { wellbore_uuid: wellboreUuid, strat_column_identifier: stratColumn },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.STRAT_COLUMN, ({ getHelperDependency }) => {
            const columns = getHelperDependency(columnOptions);

            if (!columns) return [];
            return map(columns, "identifier");
        });

        availableSettingsUpdater(Setting.SMDA_INTERPRETER, ({ getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);

            if (!wellPicks) return [];

            const picksByInterpreter = groupBy(wellPicks, "interpreter");

            return keys(picksByInterpreter);
        });

        availableSettingsUpdater(Setting.WELLBORE_PICKS, ({ getLocalSetting, getHelperDependency }) => {
            const wellPicks = getHelperDependency(wellPickOptions);
            const interpreter = getLocalSetting(Setting.SMDA_INTERPRETER);

            if (!wellPicks || !interpreter) return [];

            return filter(wellPicks, ["interpreter", interpreter]);
        });
    }

    fetchData(args: FetchDataParams<WellPickSettingTypes, WellborePick_api[]>): Promise<WellborePick_api[]> {
        const chosenWellPicks = args.getSetting(Setting.WELLBORE_PICKS);

        // ! Not actually any reason for this to be a promise.
        // No data to fetch, it's already available in the well-picks
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

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        return !isEqual(prevSettings, newSettings);
    }
}
