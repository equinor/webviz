import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";

import { DrilledWellborePicksSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { DrilledWellboresSetting } from "../../../settings/implementations/DrilledWellboresSetting";
import { EnsembleSetting } from "../../../settings/implementations/EnsembleSetting";
import { SurfaceNameSetting } from "../../../settings/implementations/SurfaceNameSetting";
import { CACHE_TIME, STALE_TIME } from "../../_utils/queryConstants";
import { cancelPromiseOnAbort } from "../../_utils/utils";

export class DrilledWellborePicksSettingsContext implements SettingsContext<DrilledWellborePicksSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellborePicksSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellborePicksSettings,
            keyof DrilledWellborePicksSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellboresSetting(),
            [SettingType.SURFACE_NAME]: new SurfaceNameSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellborePicksSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    areCurrentSettingsValid(settings: DrilledWellborePicksSettings): boolean {
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
    }: DefineDependenciesArgs<DrilledWellborePicksSettings>) {
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
                queryKey: ["getDrilledWellboreHeaders", fieldIdentifier],
                queryFn: () =>
                    cancelPromiseOnAbort(apiService.well.getDrilledWellboreHeaders(fieldIdentifier), abortSignal),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
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
                queryKey: ["getPickStratigraphy", stratColumnIdentifier],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.well.getWellborePickIdentifiers(stratColumnIdentifier),
                        abortSignal
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
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
