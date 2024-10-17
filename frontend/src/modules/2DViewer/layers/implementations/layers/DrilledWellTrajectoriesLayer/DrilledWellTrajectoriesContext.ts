import { WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { DrilledWellTrajectoriesSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { DrilledWellbores } from "../../settings/DrilledWellbores";
import { Ensemble } from "../../settings/Ensemble";

export class DrilledWellTrajectoriesContext implements SettingsContext<DrilledWellTrajectoriesSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellTrajectoriesSettings>;
    private _fetchDataCache: WellboreHeader_api[] | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellTrajectoriesSettings,
            keyof DrilledWellTrajectoriesSettings
        >(this, {
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
        oldValues: DrilledWellTrajectoriesSettings,
        newValues: DrilledWellTrajectoriesSettings
    ): Promise<boolean> {
        if (
            isEqual(oldValues[SettingType.ENSEMBLE], newValues[SettingType.ENSEMBLE]) &&
            newValues[SettingType.ENSEMBLE] !== null
        ) {
            return true;
        }
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(true);

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        const fieldIdentifier = this.getDelegate().getLayerManager().getGlobalSetting("fieldId");

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            let fieldIdentifier: string | null = null;
            if (currentEnsembleIdent) {
                const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
                if (ensemble) {
                    fieldIdentifier = ensemble.getFieldIdentifier();
                }
            }

            try {
                this._fetchDataCache = await queryClient.fetchQuery({
                    queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                    queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                });
            } catch (e) {
                settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(false);
                return false;
            }
        }

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return false;
        }
        const availableWellboreHeaders: WellboreHeader_api[] = this._fetchDataCache;
        this._contextDelegate.setAvailableValues(SettingType.SMDA_WELLBORE_HEADERS, availableWellboreHeaders);

        return true;
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue().length > 0
        );
    }
}
