import { WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { DrilledWellborePicksSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { DrilledWellbores } from "../../settings/DrilledWellbores";
import { Ensemble } from "../../settings/Ensemble";
import { SurfaceName } from "../../settings/SurfaceName";

export class DrilledWellborePicksContext implements SettingsContext<DrilledWellborePicksSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellborePicksSettings>;
    private _wellboreHeadersCache: WellboreHeader_api[] | null = null;
    private _pickIdentifierCache: string[] | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            DrilledWellborePicksSettings,
            keyof DrilledWellborePicksSettings
        >(this, {
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

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);

        if (!this._wellboreHeadersCache || !this._pickIdentifierCache) {
            return;
        }
        const availableWellboreHeaders: WellboreHeader_api[] = this._wellboreHeadersCache;
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
        const availablePickIdentifiers: string[] = this._pickIdentifierCache;
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_NAME, availablePickIdentifiers);

        let currentPickIdentifier = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        if (!currentPickIdentifier || !availablePickIdentifiers.includes(currentPickIdentifier)) {
            if (availablePickIdentifiers.length > 0) {
                currentPickIdentifier = availablePickIdentifiers[0];
                settings[SettingType.SURFACE_NAME].getDelegate().setValue(currentPickIdentifier);
            }
        }
    }

    fetchData(oldValues: DrilledWellborePicksSettings, newValues: DrilledWellborePicksSettings): void {
        if (isEqual(oldValues[SettingType.ENSEMBLE], newValues[SettingType.ENSEMBLE])) {
            return;
        }
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

        settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().setLoadingState(true);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);

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
            this._wellboreHeadersCache = null;

            let fieldIdentifier: string | null = null;
            let stratColumnIdentiier: string | null = null;
            if (currentEnsembleIdent) {
                const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
                if (ensemble) {
                    fieldIdentifier = ensemble.getFieldIdentifier();
                    stratColumnIdentiier = ensemble.getStratigraphicColumnIdentifier();
                }
            }

            const wellboreHeadersPromise = queryClient.fetchQuery({
                queryKey: ["getDrilledWellboreHeaders", fieldIdentifier ?? ""],
                queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
            const pickStratigraphyPromise = queryClient.fetchQuery({
                queryKey: ["getPickStratigraphy", fieldIdentifier ?? "", stratColumnIdentiier ?? ""],
                queryFn: () =>
                    apiService.well.getWellborePickIdentifiers(fieldIdentifier ?? "", stratColumnIdentiier ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
            Promise.all([wellboreHeadersPromise, pickStratigraphyPromise]).then(
                ([wellboreHeaders, pickIdentifiers]) => {
                    this._wellboreHeadersCache = wellboreHeaders;
                    this._pickIdentifierCache = pickIdentifiers;
                    this.setAvailableSettingsValues();
                }
            );
            return;
        }
        this.setAvailableSettingsValues();
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].getDelegate().getValue().length > 0 &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null
        );
    }
}
