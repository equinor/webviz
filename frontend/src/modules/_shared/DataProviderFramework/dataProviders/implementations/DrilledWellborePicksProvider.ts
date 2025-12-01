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
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
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
        const selectedWellboreUuids = getSetting(Setting.SMDA_WELLBORE_HEADERS) ?? [];
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
    }: DataProviderInformationAccessors<DrilledWellborePicksSettings, DrilledWellborePicksData>): boolean {
        const smdaWellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            smdaWellboreHeaders !== null &&
            smdaWellboreHeaders.length > 0 &&
            getSetting(Setting.SURFACE_NAME) !== null
        );
    }

    defineDependencies({
        helperDependency,
        valueRangeUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellborePicksSettings>) {
        valueRangeUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
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

        const pickIdentifiersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

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
        });

        valueRangeUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });

        valueRangeUpdater(Setting.SURFACE_NAME, ({ getHelperDependency }) => {
            const pickIdentifiers = getHelperDependency(pickIdentifiersDep);

            if (!pickIdentifiers) {
                return [];
            }

            return pickIdentifiers;
        });
    }
}
