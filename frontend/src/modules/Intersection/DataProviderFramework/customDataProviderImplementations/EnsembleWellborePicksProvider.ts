import { groupBy, isEqual, keys } from "lodash";

import { type WellborePick_api, getWellborePicksInStratColumnOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import { fetchWellboreHeaders } from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const ensembleWellborePicksSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.SMDA_INTERPRETER,
    Setting.WELLBORE_PICKS,
] as const;
export type EnsembleWellborePicksSettings = typeof ensembleWellborePicksSettings;
type SettingsWithTypes = MakeSettingTypesMap<EnsembleWellborePicksSettings>;

export type EnsembleWellborePicksData = WellborePick_api[];

export class EnsembleWellborePicksProvider implements CustomDataProviderImplementation<
    EnsembleWellborePicksSettings,
    EnsembleWellborePicksData
> {
    settings = ensembleWellborePicksSettings;

    getDefaultName() {
        return "Wellbore Picks";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<EnsembleWellborePicksSettings>) {
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

        const wellboreHeadersDep = makeSharedResult({
            debugName: "WellboreHeaders",
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, intersectionPolylines, fieldIdentifier }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );
                return getAvailableIntersectionOptions(wellboreHeaders ?? [], fieldIntersectionPolylines);
            },
        });

        const wellborePicksDep = makeSharedResult({
            debugName: "WellborePicks",
            read(read) {
                return {
                    ensembles: read.globalSetting("ensembles"),
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            async resolve({ ensembles, ensembleIdent, intersection }, { abortSignal }) {
                const wellboreUuid = intersection?.type === IntersectionType.WELLBORE ? intersection.uuid : null;
                const stratColumn = ensembles
                    .find((ensemble) => ensemble.getIdent().equals(ensembleIdent))
                    ?.getStratigraphicColumnIdentifier();

                if (!wellboreUuid || !stratColumn) {
                    return null;
                }

                return queryClient.fetchQuery({
                    ...getWellborePicksInStratColumnOptions({
                        query: { wellbore_uuid: wellboreUuid, strat_column_identifier: stratColumn },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.SMDA_INTERPRETER).bindValueConstraints({
            read(read) {
                return { wellborePicks: read.sharedResult(wellborePicksDep) };
            },
            resolve({ wellborePicks }) {
                if (!wellborePicks) return [];

                const picksByInterpreter = groupBy(wellborePicks, "interpreter");
                return Array.from(keys(picksByInterpreter)).sort();
            },
        });

        setting(Setting.WELLBORE_PICKS).bindValueConstraints({
            read(read) {
                return {
                    wellborePicks: read.sharedResult(wellborePicksDep),
                    selectedInterpreter: read.localSetting(Setting.SMDA_INTERPRETER),
                };
            },
            resolve({ wellborePicks, selectedInterpreter }) {
                if (!wellborePicks || !selectedInterpreter) {
                    return [];
                }
                return wellborePicks.filter((elm) => elm.interpreter === selectedInterpreter);
            },
        });
    }

    fetchData({
        getSetting,
    }: FetchDataParams<EnsembleWellborePicksSettings, EnsembleWellborePicksData>): Promise<EnsembleWellborePicksData> {
        const selectedWellborePicks = getSetting(Setting.WELLBORE_PICKS) ?? [];

        // ! Not actually any reason for this to be a promise.
        // No data to fetch, it's already available in the well-picks settings
        return new Promise((resolve) => {
            resolve(selectedWellborePicks);
        });
    }
}
