import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { DrilledWellTrajectoriesSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { DrilledWellboresSetting } from "../../settings/DrilledWellboresSetting";
import { EnsembleSetting } from "../../settings/EnsembleSetting";

export class DrilledWellTrajectoriesSettingsContext implements SettingsContext<DrilledWellTrajectoriesSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellTrajectoriesSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellTrajectoriesSettings,
            keyof DrilledWellTrajectoriesSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellboresSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellTrajectoriesSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellTrajectoriesSettings>) {
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
        availableSettingsUpdater(SettingType.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });
    }
}
