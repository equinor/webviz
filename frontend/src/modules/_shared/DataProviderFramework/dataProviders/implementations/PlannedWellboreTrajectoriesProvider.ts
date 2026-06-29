import { isEqual } from "lodash";

import type { WellboreTrajectory_api } from "@api";
import { getPlannedWellboreHeadersOptions, getPlannedWellTrajectoriesOptions } from "@api";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { getAvailableEnsembleIdentsForField } from "../dependencyFunctions/sharedSettingUpdaterFunctions";

const plannedWellboreTrajectoriesSettings = [Setting.ENSEMBLE, Setting.WELLBORES] as const;
export type PlannedWellboreTrajectoriesSettings = typeof plannedWellboreTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<PlannedWellboreTrajectoriesSettings>;

export type PlannedWellboreTrajectoriesData = WellboreTrajectory_api[];

export class PlannedWellboreTrajectoriesProvider implements CustomDataProviderImplementation<
    PlannedWellboreTrajectoriesSettings,
    PlannedWellboreTrajectoriesData
> {
    settings = plannedWellboreTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Planned)";
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<PlannedWellboreTrajectoriesSettings, PlannedWellboreTrajectoriesData>): boolean {
        if (!getSetting(Setting.ENSEMBLE)) {
            return false;
        }

        return true;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        return (
            !isEqual(prevSettings?.[Setting.ENSEMBLE], newSettings[Setting.ENSEMBLE]) ||
            !isEqual(prevSettings?.[Setting.WELLBORES], newSettings[Setting.WELLBORES])
        );
    }

    async fetchData({
        getGlobalSetting,
        getSetting,
        fetchQuery,
    }: FetchDataParams<
        PlannedWellboreTrajectoriesSettings,
        PlannedWellboreTrajectoriesData
    >): Promise<PlannedWellboreTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellboreHeaders = getSetting(Setting.WELLBORES);

        const selectedWellboreUuids = selectedWellboreHeaders?.map((wb) => wb.wellboreUuid) ?? [];

        const plannedWellTrajectoriesQueryOptions = getPlannedWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const allPlannedWellTrajectories = await fetchQuery({
            ...plannedWellTrajectoriesQueryOptions,
            staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
            gcTime: 1800000,
        });

        return allPlannedWellTrajectories.filter((traj) => selectedWellboreUuids.includes(traj.wellboreUuid));
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
    }: SetupBindingsContext<PlannedWellboreTrajectoriesSettings>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
            },
        });

        const plannedWellboreHeaders = makeSharedResult({
            debugName: "PlannedWellboreHeaders",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            async resolve({ fieldIdentifier }, { abortSignal }) {
                if (!fieldIdentifier) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getPlannedWellboreHeadersOptions({
                        query: { field_identifier: fieldIdentifier },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.WELLBORES).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(plannedWellboreHeaders),
                };
            },
            resolve({ wellboreHeaders }) {
                if (!wellboreHeaders) {
                    return [];
                }

                return wellboreHeaders;
            },
        });
    }
}
