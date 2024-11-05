import { WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { DrilledWellborePicksSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { DrilledWellbores } from "../../settings/DrilledWellbores";
import { Ensemble } from "../../settings/Ensemble";
import { SurfaceName } from "../../settings/SurfaceName";

export class DrilledWellborePicksContext implements SettingsContext<DrilledWellborePicksSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellborePicksSettings>;
    private _wellboreHeadersCache: WellboreHeader_api[] | null = null;
    private _pickIdentifierCache: string[] | null = null;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellborePicksSettings,
            keyof DrilledWellborePicksSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellbores(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
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
            settings[SettingType.SMDA_WELLBORE_HEADERS]?.length > 0 &&
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
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getEnsembleArr()
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

            const fieldIdentifier = ensemble.getFieldIdentifier();
            const stratColumnIdentifier = ensemble.getStratigraphicColumnIdentifier();

            return await queryClient.fetchQuery({
                queryKey: ["getPickStratigraphy", fieldIdentifier, stratColumnIdentifier],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.well.getWellborePickIdentifiers(fieldIdentifier, stratColumnIdentifier),
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
