import { SurfaceMetaSet_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { RealizationSurfaceSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { Realization } from "../../settings/Realization";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceName } from "../../settings/SurfaceName";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class RealizationSurfaceContext implements SettingsContext<RealizationSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationSurfaceSettings>;
    private _fetchDataCache: SurfaceMetaSet_api | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationSurfaceSettings,
            keyof RealizationSurfaceSettings
        >(this, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.REALIZATION]: new Realization(),
            [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttribute(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    async fetchData(oldValues: RealizationSurfaceSettings, newValues: RealizationSurfaceSettings): Promise<boolean> {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();
        const fieldIdentifier = this.getDelegate().getLayerManager().getGlobalSetting("fieldId");

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();

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

            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);

            try {
                this._fetchDataCache = await queryClient.fetchQuery({
                    queryKey: [
                        "getRealizationSurfacesMetadata",
                        newValues[SettingType.ENSEMBLE],
                        newValues[SettingType.REALIZATION],
                    ],
                    queryFn: () =>
                        apiService.surface.getRealizationSurfacesMetadata(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                });
            } catch (e) {
                settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
                settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
                settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);
                return false;
            }
        }

        settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return false;
        }

        if (!this._fetchDataCache.surfaces) {
            return false;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.surfaces.map((surface) => surface.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_ATTRIBUTE, availableAttributes);

        const currentAttribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();

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

        const currentSurfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();

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
            if (availableTimeTypes.includes(SurfaceTimeType_api.NO_TIME)) {
                availableTimeOrIntervals.push(SurfaceTimeType_api.NO_TIME);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.TIME_POINT)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_points_iso_str);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.INTERVAL)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_intervals_iso_str);
            }
        }
        this._contextDelegate.setAvailableValues(SettingType.TIME_OR_INTERVAL, availableTimeOrIntervals);

        return true;
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.REALIZATION].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue() !== null
        );
    }
}
