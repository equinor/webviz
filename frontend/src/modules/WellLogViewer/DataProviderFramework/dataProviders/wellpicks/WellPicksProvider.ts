import { filter, groupBy, isEqual, keys, map } from "lodash";

import type { WellborePick_api } from "@api";
import { getWellborePicksInStratColumnOptions, getWellboreStratigraphicColumnsOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBasicBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

export const wellPickSettings = [Setting.STRAT_COLUMN, Setting.SMDA_INTERPRETER, Setting.WELLBORE_PICKS] as const;
export type WellPickSettingTypes = typeof wellPickSettings;
type SettingsTypeMap = MakeSettingTypesMap<WellPickSettingTypes>;

export class WellborePicksProvider
    implements CustomDataProviderImplementation<WellPickSettingTypes, WellborePick_api[]>
{
    settings = wellPickSettings;

    setupBindings({ setting, makeSharedResult, queryClient }: SetupBasicBindingsContext<WellPickSettingTypes>) {
        const columnOptionsDep = makeSharedResult({
            debugName: "StratigraphicColumns",
            read({ read }) {
                return { wellboreUuid: read.globalSetting("wellboreUuid") };
            },
            async resolve({ wellboreUuid }, { abortSignal }) {
                if (!wellboreUuid) return null;

                return queryClient.fetchQuery({
                    ...getWellboreStratigraphicColumnsOptions({
                        query: { wellbore_uuid: wellboreUuid },
                        signal: abortSignal,
                    }),
                });
            },
        });

        const wellPickOptionsDep = makeSharedResult({
            debugName: "WellPickOptions",
            read({ read }) {
                return {
                    wellboreUuid: read.globalSetting("wellboreUuid"),
                    stratColumn: read.localSetting(Setting.STRAT_COLUMN),
                };
            },
            async resolve({ wellboreUuid, stratColumn }, { abortSignal }) {
                if (!wellboreUuid || !stratColumn) return null;

                return queryClient.fetchQuery({
                    ...getWellborePicksInStratColumnOptions({
                        query: { wellbore_uuid: wellboreUuid, strat_column_identifier: stratColumn },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.STRAT_COLUMN).bindValueConstraints({
            read({ read }) {
                return { columns: read.sharedResult(columnOptionsDep) };
            },
            resolve({ columns }) {
                if (!columns) return [];
                return map(columns, "identifier");
            },
        });

        setting(Setting.SMDA_INTERPRETER).bindValueConstraints({
            read({ read }) {
                return { wellPicks: read.sharedResult(wellPickOptionsDep) };
            },
            resolve({ wellPicks }) {
                if (!wellPicks) return [];
                return keys(groupBy(wellPicks, "interpreter"));
            },
        });

        setting(Setting.WELLBORE_PICKS).bindValueConstraints({
            read({ read }) {
                return {
                    wellPicks: read.sharedResult(wellPickOptionsDep),
                    interpreter: read.localSetting(Setting.SMDA_INTERPRETER),
                };
            },
            resolve({ wellPicks, interpreter }) {
                if (!wellPicks || !interpreter) return [];
                return filter(wellPicks, ["interpreter", interpreter]);
            },
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

    areCurrentSettingsValid(accessor: DataProviderAccessors<WellPickSettingTypes, WellborePick_api[]>) {
        return accessor.getSetting(Setting.STRAT_COLUMN) != null;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsTypeMap, newSettings: SettingsTypeMap): boolean {
        return !isEqual(prevSettings, newSettings);
    }
}
