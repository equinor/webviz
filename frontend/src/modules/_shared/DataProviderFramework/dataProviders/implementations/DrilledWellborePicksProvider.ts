import { isEqual } from "lodash";

import type { WellborePick_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getWellborePickIdentifiersOptions,
    getWellborePicksForPickIdentifierOptions,
} from "@api";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const drilledWellborePicksSettings = [Setting.ENSEMBLE, Setting.SMDA_WELLBORE_HEADERS, Setting.SURFACE_NAME] as const;
export type DrilledWellborePicksSettings = typeof drilledWellborePicksSettings;

export type DrilledWellborePicksData = WellborePick_api[];

type SettingsWithTypes = MakeSettingTypesMap<DrilledWellborePicksSettings>;

export class DrilledWellborePicksProvider
    implements CustomDataProviderImplementation<DrilledWellborePicksSettings, DrilledWellborePicksData>
{
    settings = drilledWellborePicksSettings;

    getDefaultName() {
        return "Well Picks (Official)";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<DrilledWellborePicksSettings, DrilledWellborePicksData>): Promise<WellborePick_api[]> {
        const selectedWellbores = getSetting(Setting.SMDA_WELLBORE_HEADERS) ?? [];
        const selectedWellboreUuids = selectedWellbores.map((wb) => wb.wellboreUuid);
        const selectedPickIdentifier = getSetting(Setting.SURFACE_NAME);
        const fieldIdentifier = getGlobalSetting("fieldId");

        const queryOptions = getWellborePicksForPickIdentifierOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
                pick_identifier: selectedPickIdentifier ?? "",
            },
        });

        const promise = fetchQuery(queryOptions).then((response: WellborePick_api[]) => {
            return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
        });

        return promise;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<DrilledWellborePicksSettings, DrilledWellborePicksData>): boolean {
        const smdaWellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            smdaWellboreHeaders !== null &&
            smdaWellboreHeaders.length > 0 &&
            getSetting(Setting.SURFACE_NAME) !== null
        );
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<DrilledWellborePicksSettings>) {
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

        const pickIdentifiersDep = makeSharedResult({
            debugName: "PickIdentifiers",
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

                const stratColumnIdentifier = ensemble.getStratigraphicColumnIdentifier();

                return await queryClient.fetchQuery({
                    ...getWellborePickIdentifiersOptions({
                        query: { strat_column_identifier: stratColumnIdentifier },
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

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read({ read }) {
                return {
                    pickIdentifiers: read.sharedResult(pickIdentifiersDep),
                };
            },
            resolve({ pickIdentifiers }) {
                if (!pickIdentifiers) {
                    return [];
                }
                return pickIdentifiers;
            },
        });
    }
}
