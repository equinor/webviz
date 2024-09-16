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

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }
        const availableWellboreHeaders: WellboreHeader_api[] = this._fetchDataCache;
        this._contextDelegate.setAvailableValues(SettingType.SMDA_WELLBORE_HEADERS, availableWellboreHeaders);

        const currentWellboreHeaders = settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue();
        let newWellboreHeaders = currentWellboreHeaders.filter((header) =>
            availableWellboreHeaders.some((availableHeader) => availableHeader.wellboreUuid === header.wellboreUuid)
        );
        if (newWellboreHeaders.length === 0) {
            newWellboreHeaders = availableWellboreHeaders;
        }
        if (!isEqual(currentWellboreHeaders, newWellboreHeaders)) {
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setValue(newWellboreHeaders);
        }
    }

    fetchData(oldValues: DrilledWellTrajectoriesSettings, newValues: DrilledWellTrajectoriesSettings): void {
        if (isEqual(oldValues[SettingType.ENSEMBLE], newValues[SettingType.ENSEMBLE])) {
            return;
        }
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(true);

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent())
        );

        const availableEnsembleIdents = ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent());
        let currentEnsembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();

        // Fix up EnsembleIdent
        if (currentEnsembleIdent === null || !availableEnsembleIdents.includes(currentEnsembleIdent)) {
            if (availableEnsembleIdents.length > 0) {
                currentEnsembleIdent = availableEnsembleIdents[0];
                settings[SettingType.ENSEMBLE].getDelegate().setValue(currentEnsembleIdent);
            }
        }

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            let fieldIdentifier: string | null = null;
            if (currentEnsembleIdent) {
                const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
                if (ensemble) {
                    fieldIdentifier = ensemble.getFieldIdentifier();
                }
            }

            queryClient
                .fetchQuery({
                    queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                    queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: WellboreHeader_api[]) => {
                    this._fetchDataCache = response;
                    this.setAvailableSettingsValues();
                });
            return;
        }
        this.setAvailableSettingsValues();
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue().length > 0
        );
    }
}
