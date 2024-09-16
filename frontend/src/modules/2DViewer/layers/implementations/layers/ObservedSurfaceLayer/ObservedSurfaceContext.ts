import { SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";
import { SurfaceMetaSet } from "src/api/models/SurfaceMetaSet";

import { ObservedSurfaceSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceName } from "../../settings/SurfaceName";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class ObservedSurfaceContext implements SettingsContext<ObservedSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<ObservedSurfaceSettings>;
    private _fetchDataCache: SurfaceMetaSet | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<ObservedSurfaceSettings, keyof ObservedSurfaceSettings>(
            this,
            {
                [SettingType.ENSEMBLE]: new Ensemble(),
                [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttribute(),
                [SettingType.SURFACE_NAME]: new SurfaceName(),
                [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
            }
        );
    }

    getDelegate(): SettingsContextDelegate<ObservedSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.surfaces.map((surface) => surface.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_ATTRIBUTE, availableAttributes);

        let currentAttribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        if (!currentAttribute || !availableAttributes.includes(currentAttribute)) {
            if (availableAttributes.length > 0) {
                currentAttribute = availableAttributes[0];
                settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setValue(currentAttribute);
            }
        }

        const availableSurfaceNames: string[] = [];

        if (currentAttribute) {
            availableSurfaceNames.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache.surfaces
                            .filter((surface) => surface.attribute_name === currentAttribute)
                            .map((el) => el.name)
                    )
                )
            );
        }
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_NAME, availableSurfaceNames);

        let currentSurfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        if (!currentSurfaceName || !availableSurfaceNames.includes(currentSurfaceName)) {
            if (availableSurfaceNames.length > 0) {
                currentSurfaceName = availableSurfaceNames[0];
                settings[SettingType.SURFACE_NAME].getDelegate().setValue(currentSurfaceName);
            }
        }

        const availableTimeOrIntervals: string[] = [];
        if (currentAttribute && currentSurfaceName) {
            const availableTimeTypes: SurfaceTimeType_api[] = [];
            availableTimeTypes.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache.surfaces
                            .filter(
                                (surface) =>
                                    surface.attribute_name === currentAttribute && surface.name === currentSurfaceName
                            )
                            .map((el) => el.time_type)
                    )
                )
            );

            if (availableTimeTypes.includes(SurfaceTimeType_api.TIME_POINT)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_points_iso_str);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.INTERVAL)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_intervals_iso_str);
            }
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

    fetchData(oldValues: ObservedSurfaceSettings, newValues: ObservedSurfaceSettings): void {
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

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setValue(null);

            queryClient
                .fetchQuery({
                    queryKey: ["getObservedSurfacesMetadata", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.surface.getObservedSurfacesMetadata(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: SurfaceMetaSet) => {
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
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue() !== null
        );
    }
}
