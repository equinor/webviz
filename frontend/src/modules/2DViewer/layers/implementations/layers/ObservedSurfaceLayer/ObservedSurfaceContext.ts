import { SurfaceMetaSet_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { ObservedSurfaceSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceName } from "../../settings/SurfaceName";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class ObservedSurfaceContext implements SettingsContext<ObservedSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<ObservedSurfaceSettings>;
    private _fetchDataCache: SurfaceMetaSet_api | null = null;

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

    async fetchData(
        oldValues: Partial<ObservedSurfaceSettings>,
        newValues: Partial<ObservedSurfaceSettings>
    ): Promise<boolean> {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();
        const settings = this.getDelegate().getSettings();
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

        const currentEnsembleIdent = newValues[SettingType.ENSEMBLE];

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);

            try {
                this._fetchDataCache = await queryClient.fetchQuery({
                    queryKey: ["getObservedSurfacesMetadata", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.surface.getObservedSurfacesMetadata(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? ""
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
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);
        }

        if (!this._fetchDataCache) {
            return false;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.surfaces.map((surface) => surface.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_ATTRIBUTE, availableAttributes);

        const currentAttribute = newValues[SettingType.SURFACE_ATTRIBUTE];
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

        const currentSurfaceName = newValues[SettingType.SURFACE_NAME];

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

        return true;
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
