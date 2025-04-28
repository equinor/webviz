import { type WellborePick_api, getDrilledWellboreHeadersOptions, getWellborePicksInStratColumnOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { filter, groupBy, isEqual, keys } from "lodash";

const ensembleWellborePicksSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.WELLBORE_PICK_IDENTIFIER,
    Setting.WELLBORE_PICKS,
] as const;
export type EnsembleWellborePicksSettings = typeof ensembleWellborePicksSettings;
type SettingsWithTypes = MakeSettingTypesMap<EnsembleWellborePicksSettings>;

export type EnsembleWellborePicksData = WellborePick_api[];

export class EnsembleWellborePicksProvider
    implements CustomDataProviderImplementation<EnsembleWellborePicksSettings, EnsembleWellborePicksData>
{
    settings = ensembleWellborePicksSettings;

    getDefaultName() {
        return "Wellbore Picks";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
        workbenchSession,
    }: DefineDependenciesArgs<EnsembleWellborePicksSettings>): void {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

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
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");

            const intersectionOptions: IntersectionSettingValue[] = [];
            if (wellboreHeaders) {
                for (const wellboreHeader of wellboreHeaders) {
                    intersectionOptions.push({
                        type: IntersectionType.WELLBORE,
                        name: wellboreHeader.uniqueWellboreIdentifier,
                        uuid: wellboreHeader.wellboreUuid,
                    });
                }
            }

            for (const polyline of intersectionPolylines) {
                intersectionOptions.push({
                    type: IntersectionType.CUSTOM_POLYLINE,
                    name: polyline.name,
                    uuid: polyline.id,
                });
            }

            return intersectionOptions;
        });

        const wellborePicksDep = helperDependency(({ getGlobalSetting, getLocalSetting, abortSignal }) => {
            const ensembles = getGlobalSetting("ensembles");
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const intersection = getLocalSetting(Setting.INTERSECTION);

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
        });

        availableSettingsUpdater(Setting.WELLBORE_PICK_IDENTIFIER, ({ getHelperDependency }) => {
            const wellborePicks = getHelperDependency(wellborePicksDep);

            if (!wellborePicks) return [];

            const picksByInterpreter = groupBy(wellborePicks, "interpreter");

            return keys(picksByInterpreter);
        });

        availableSettingsUpdater(Setting.WELLBORE_PICKS, ({ getLocalSetting, getHelperDependency }) => {
            const wellborePicks = getHelperDependency(wellborePicksDep);
            const interpreter = getLocalSetting(Setting.WELLBORE_PICK_IDENTIFIER);

            if (!wellborePicks || !interpreter) {
                return [];
            }

            return filter(wellborePicks, ["interpreter", interpreter]);
        });
    }

    fetchData({
        getSetting,
    }: FetchDataParams<EnsembleWellborePicksSettings, EnsembleWellborePicksData>): Promise<EnsembleWellborePicksData> {
        const selectedWellborePicks = getSetting(Setting.WELLBORE_PICKS) ?? [];

        // TODO:
        // Settings: unique combination of interpreter + pick identifier
        // Fetch wellbore picks in strat column and filter with selected interpreter and pick identifiers here
        // The fetched data is cached bu tanstack query, rather than storing the picks in StoredData

        // ! Not actually any reason for this to be a promise.
        // No data to fetch, it's already available in the well-picks settings
        return new Promise((resolve) => {
            resolve(selectedWellborePicks);
        });
    }
}
