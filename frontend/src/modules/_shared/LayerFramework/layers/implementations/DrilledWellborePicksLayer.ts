import type { WellborePick_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getWellborePickIdentifiersOptions,
    getWellborePicksForPickIdentifierOptions,
} from "@api";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";

const drilledWellborePicksSettings = [Setting.ENSEMBLE, Setting.SMDA_WELLBORE_HEADERS, Setting.SURFACE_NAME] as const;
export type DrilledWellborePicksSettings = typeof drilledWellborePicksSettings;

export type DrilledWellborePicksData = WellborePick_api[];

type SettingsWithTypes = MakeSettingTypesMap<DrilledWellborePicksSettings>;

export class DrilledWellborePicksLayer
    implements CustomDataLayerImplementation<DrilledWellborePicksSettings, DrilledWellborePicksData>
{
    settings = drilledWellborePicksSettings;

    getDefaultName() {
        return "Drilled Wellbore Picks";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<DrilledWellborePicksSettings, DrilledWellborePicksData>): Promise<WellborePick_api[]> {
        const selectedWellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }
        const selectedPickIdentifier = getSetting(Setting.SURFACE_NAME);
        const fieldIdentifier = getGlobalSetting("fieldId");

        const queryKey = ["getWellborePicksForPickIdentifier", fieldIdentifier, selectedPickIdentifier];
        registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                ...getWellborePicksForPickIdentifierOptions({
                    query: {
                        field_identifier: fieldIdentifier ?? "",
                        pick_identifier: selectedPickIdentifier ?? "",
                    },
                }),
            })
            .then((response: WellborePick_api[]) => {
                return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
            });

        return promise;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataLayerInformationAccessors<DrilledWellborePicksSettings, DrilledWellborePicksData>): boolean {
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
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellborePicksSettings>) {
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

        availableSettingsUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });

        availableSettingsUpdater(Setting.SURFACE_NAME, ({ getHelperDependency }) => {
            const pickIdentifiers = getHelperDependency(pickIdentifiersDep);

            if (!pickIdentifiers) {
                return [];
            }

            return pickIdentifiers;
        });
    }
}
