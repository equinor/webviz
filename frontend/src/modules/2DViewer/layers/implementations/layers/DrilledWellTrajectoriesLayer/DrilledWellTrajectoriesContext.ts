import { WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { DrilledWellTrajectoriesSettings } from "./types";

import { FetchDataFunctionResult, SettingsContext } from "../../../interfaces";
import { DrilledWellbores } from "../../settings/DrilledWellbores";
import { Ensemble } from "../../settings/Ensemble";

export class DrilledWellTrajectoriesContext implements SettingsContext<DrilledWellTrajectoriesSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellTrajectoriesSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellTrajectoriesSettings,
            keyof DrilledWellTrajectoriesSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellbores(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellTrajectoriesSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    async fetchData(
        oldValues: Partial<DrilledWellTrajectoriesSettings>,
        newValues: Partial<DrilledWellTrajectoriesSettings>
    ): Promise<FetchDataFunctionResult> {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        let fieldIdentifier = this.getDelegate().getLayerManager().getGlobalSetting("fieldId");

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = newValues[SettingType.ENSEMBLE];

        if (!currentEnsembleIdent) {
            return FetchDataFunctionResult.ERROR;
        }

        let fetchedData: WellboreHeader_api[] | null = null;

        const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(true);

        try {
            fetchedData = await queryClient.fetchQuery({
                queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        } catch (e) {
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(false);
            return FetchDataFunctionResult.ERROR;
        }

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setIsLoading(false);

        if (!fetchedData) {
            return FetchDataFunctionResult.IN_PROGRESS;
        }
        const availableWellboreHeaders: WellboreHeader_api[] = fetchedData;
        this._contextDelegate.setAvailableValues(SettingType.SMDA_WELLBORE_HEADERS, availableWellboreHeaders);

        return FetchDataFunctionResult.SUCCESS;
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue().length > 0
        );
    }
}
