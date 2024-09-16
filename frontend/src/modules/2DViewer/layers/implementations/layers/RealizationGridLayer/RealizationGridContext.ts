import { Grid3dInfo_api, Grid3dPropertyInfo_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";
import { SurfaceMetaSet } from "src/api/models/SurfaceMetaSet";

import { RealizationGridSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { GridAttribute } from "../../settings/GridAttribute";
import { GridLayer } from "../../settings/GridLayer";
import { GridName } from "../../settings/GridName";
import { Realization } from "../../settings/Realization";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class RealizationGridContext implements SettingsContext<RealizationGridSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationGridSettings>;
    private _fetchDataCache: Grid3dInfo_api[] | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<RealizationGridSettings, keyof RealizationGridSettings>(
            this,
            {
                [SettingType.ENSEMBLE]: new Ensemble(),
                [SettingType.REALIZATION]: new Realization(),
                [SettingType.GRID_NAME]: new GridName(),
                [SettingType.GRID_ATTRIBUTE]: new GridAttribute(),
                [SettingType.GRID_LAYER]: new GridLayer(),
                [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
            }
        );
    }

    getDelegate(): SettingsContextDelegate<RealizationGridSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.GRID_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.GRID_NAME].getDelegate().setLoadingState(false);
        settings[SettingType.GRID_LAYER].getDelegate().setLoadingState(false);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }

        const availableGridNames: string[] = [];
        availableGridNames.push(...Array.from(new Set(this._fetchDataCache.map((gridModel) => gridModel.grid_name))));
        this._contextDelegate.setAvailableValues(SettingType.GRID_NAME, availableGridNames);

        let currentGridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        if (!currentGridName || !availableGridNames.includes(currentGridName)) {
            if (availableGridNames.length > 0) {
                currentGridName = availableGridNames[0];
                settings[SettingType.GRID_NAME].getDelegate().setValue(currentGridName);
            }
        }
        const gridDimensions =
            this._fetchDataCache.find((gridModel) => gridModel.grid_name === currentGridName)?.dimensions ?? null;
        const availableGridLayers: number[] = [];
        if (gridDimensions) {
            availableGridLayers.push(gridDimensions.i_count);
            availableGridLayers.push(gridDimensions.j_count);
            availableGridLayers.push(gridDimensions.k_count);
        }
        this._contextDelegate.setAvailableValues(SettingType.GRID_LAYER, availableGridLayers);

        let currentGridLayer = settings[SettingType.GRID_LAYER].getDelegate().getValue();
        if (currentGridLayer === null || !availableGridLayers.length || availableGridLayers[2] < currentGridLayer) {
            currentGridLayer = availableGridLayers[2];
            settings[SettingType.GRID_LAYER].getDelegate().setValue(currentGridLayer);
        }

        const availableGridAttributes: string[] = [];
        const gridAttributeArr: Grid3dPropertyInfo_api[] =
            this._fetchDataCache.find((gridModel) => gridModel.grid_name === currentGridName)?.property_info_arr ?? [];

        if (currentGridName) {
            availableGridAttributes.push(...Array.from(new Set(gridAttributeArr.map((el) => el.property_name))));
        }
        this._contextDelegate.setAvailableValues(SettingType.GRID_ATTRIBUTE, availableGridAttributes);

        let currentGridAttribute = settings[SettingType.GRID_ATTRIBUTE].getDelegate().getValue();
        if (!currentGridAttribute || !availableGridAttributes.includes(currentGridAttribute)) {
            if (availableGridAttributes.length > 0) {
                currentGridAttribute = availableGridAttributes[0];
                settings[SettingType.GRID_ATTRIBUTE].getDelegate().setValue(currentGridAttribute);
            }
        }

        const availableTimeOrIntervals: string[] = [];
        if (currentGridName && currentGridAttribute) {
            availableTimeOrIntervals.push(
                ...Array.from(
                    new Set(
                        gridAttributeArr
                            .filter((attr) => attr.property_name === currentGridAttribute)
                            .map((el) => el.iso_date_or_interval ?? "NO_TIME")
                    )
                )
            );
        }
        this._contextDelegate.setAvailableValues(SettingType.TIME_OR_INTERVAL, availableTimeOrIntervals);

        let currentTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (!currentTimeOrInterval || !availableTimeOrIntervals.includes(currentTimeOrInterval)) {
            if (availableTimeOrIntervals.length > 0) {
                currentTimeOrInterval = availableTimeOrIntervals[0];
                settings[SettingType.TIME_OR_INTERVAL].getDelegate().setValue(currentTimeOrInterval);
            }
        }
    }

    fetchData(oldValues: RealizationGridSettings, newValues: RealizationGridSettings): void {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

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
        if (currentEnsembleIdent !== null) {
            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(currentEnsembleIdent)
                .getFilteredRealizations();
            this.getDelegate().setAvailableValues(SettingType.REALIZATION, [...realizations]);

            const currentRealization = newValues[SettingType.REALIZATION];
            if (currentRealization === null || !realizations.includes(currentRealization)) {
                if (realizations.length > 0) {
                    settings[SettingType.REALIZATION].getDelegate().setValue(realizations[0]);
                }
            }
        }

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.GRID_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.GRID_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);

            queryClient
                .fetchQuery({
                    queryKey: [
                        "getRealizationGridsMetadata",
                        newValues[SettingType.ENSEMBLE],
                        newValues[SettingType.REALIZATION],
                    ],
                    queryFn: () =>
                        apiService.grid3D.getGridModelsInfo(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? "",
                            newValues[SettingType.REALIZATION] ?? 0
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: Grid3dInfo_api[]) => {
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
            settings[SettingType.GRID_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.GRID_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue() !== null
        );
    }
}
