import { filter, groupBy, isEqual, keys } from "lodash";

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
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

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
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");
            const fieldIdentifier = getGlobalSetting("fieldId");

            const fieldIntersectionPolylines = intersectionPolylines.filter(
                (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
            );

            return getAvailableIntersectionOptions(wellboreHeaders, fieldIntersectionPolylines);
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

            return Array.from(keys(picksByInterpreter)).sort();
        });

        availableSettingsUpdater(Setting.WELLBORE_PICKS, ({ getLocalSetting, getHelperDependency }) => {
            const wellborePicks = getHelperDependency(wellborePicksDep);
            const interpreter = getLocalSetting(Setting.WELLBORE_PICK_IDENTIFIER);

            if (!wellborePicks || !interpreter) {
                return [];
            }

            return filter(wellborePicks, ["interpreter", interpreter]).sort();
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
