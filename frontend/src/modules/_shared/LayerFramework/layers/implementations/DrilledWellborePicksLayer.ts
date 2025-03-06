import {
    WellborePick_api,
    getDrilledWellboreHeadersOptions,
    getWellborePickIdentifiersOptions,
    getWellborePicksForPickIdentifierOptions,
} from "@api";
import {
    CustomDataLayerImplementation,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { isEqual } from "lodash";

const drilledWellborePicksSettings = [
    SettingType.ENSEMBLE,
    SettingType.SMDA_WELLBORE_HEADERS,
    SettingType.SURFACE_NAME,
] as const;
export type DrilledWellborePicksSettings = typeof drilledWellborePicksSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellborePicksSettings>;

export type Data = WellborePick_api[];

export class DrilledWellborePicksLayer implements CustomDataLayerImplementation<DrilledWellborePicksSettings, Data> {
    settings = drilledWellborePicksSettings;

    getDefaultSettingsValues() {
        return {
            [SettingType.ENSEMBLE]: null,
            [SettingType.SMDA_WELLBORE_HEADERS]: null,
            [SettingType.SURFACE_NAME]: null,
        };
    }

    getDefaultName() {
        return "Drilled Well Picks";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.NONE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<SettingsWithTypes, Data>): Promise<WellborePick_api[]> {
        const selectedWellboreHeaders = getSetting(SettingType.SMDA_WELLBORE_HEADERS);
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }
        const selectedPickIdentifier = getSetting(SettingType.SURFACE_NAME);
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

    areCurrentSettingsValid(settings: SettingsWithTypes): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS] !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].length > 0 &&
            settings[SettingType.SURFACE_NAME] !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellborePicksSettings, SettingsWithTypes>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

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
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

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

        availableSettingsUpdater(SettingType.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });

        availableSettingsUpdater(SettingType.SURFACE_NAME, ({ getHelperDependency }) => {
            const pickIdentifiers = getHelperDependency(pickIdentifiersDep);

            if (!pickIdentifiers) {
                return [];
            }

            return pickIdentifiers;
        });
    }
}
