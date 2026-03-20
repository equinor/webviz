import { isEqual } from "lodash";

import type { WellboreTrajectory_api } from "@api";
import { getDrilledWellboreHeadersOptions, getWellTrajectoriesOptions } from "@api";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const drilledWellTrajectoriesSettings = [Setting.ENSEMBLE, Setting.SMDA_WELLBORE_HEADERS] as const;
type DrilledWellTrajectoriesSettings = typeof drilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;

type DrilledWellTrajectoriesData = WellboreTrajectory_api[];

export class DrilledWellTrajectoriesProvider implements CustomDataProviderImplementation<
    DrilledWellTrajectoriesSettings,
    DrilledWellTrajectoriesData
> {
    settings = drilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Official)";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<
        DrilledWellTrajectoriesSettings,
        DrilledWellTrajectoriesData
    >): Promise<DrilledWellTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellbores = getSetting(Setting.SMDA_WELLBORE_HEADERS) ?? [];
        const selectedWellboreUuids = selectedWellbores.map((wb) => wb.wellboreUuid);

        const queryOptions = getWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const promise = fetchQuery({
            ...queryOptions,
            staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
            gcTime: 1800000,
        }).then((response: DrilledWellTrajectoriesData) => {
            return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
        });

        return promise;
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<DrilledWellTrajectoriesSettings>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                    .map((ensemble) => ensemble.getIdent());
            },
        });

        const wellboreHeadersDep = makeSharedResult({
            debugName: "WellboreHeaders",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                if (!ensembleIdent) {
                    return null;
                }

                const ensembleSet = workbenchSession.getEnsembleSet();
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);

                if (!ensemble) {
                    return null;
                }

                const fieldIdentifier = ensemble.getFieldIdentifier();

                return await queryClient.fetchQuery({
                    ...getDrilledWellboreHeadersOptions({
                        query: { field_identifier: fieldIdentifier },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.SMDA_WELLBORE_HEADERS).bindValueConstraints({
            read({ read }) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
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
