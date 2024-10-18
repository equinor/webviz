import { SurfaceMetaSet_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { Ensemble as FrameworkEnsemble } from "@framework/Ensemble";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";

import { isEqual } from "lodash";

import { StatisticalSurfaceSettings } from "./types";

import { SettingsContextDelegate } from "../../../delegates/SettingsContextDelegate";
import { SettingsContext } from "../../../interfaces";
import { SettingType } from "../../../settingsTypes";
import { Ensemble } from "../../settings/Ensemble";
import { Sensitivity, SensitivityNameCasePair } from "../../settings/Sensitivity";
import { StatisticFunction } from "../../settings/StatisticFunction";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceName } from "../../settings/SurfaceName";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class StatisticalSurfaceContext implements SettingsContext<StatisticalSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<StatisticalSurfaceSettings>;
    private _fetchDataCache: SurfaceMetaSet_api | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            StatisticalSurfaceSettings,
            keyof StatisticalSurfaceSettings
        >(this, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.STATISTIC_FUNCTION]: new StatisticFunction(),
            [SettingType.SENSITIVITY]: new Sensitivity(),
            [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttribute(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
        });
    }

    getDelegate(): SettingsContextDelegate<StatisticalSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    async fetchData(oldValues: StatisticalSurfaceSettings, newValues: StatisticalSurfaceSettings): Promise<boolean> {
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

        const currentEnsembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.SENSITIVITY].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);

            try {
                this._fetchDataCache = await queryClient.fetchQuery({
                    queryKey: ["getRealizationSurfacesMetadata", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.surface.getRealizationSurfacesMetadata(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                });
            } catch (e) {
                settings[SettingType.SENSITIVITY].getDelegate().setLoadingState(false);
                settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
                settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
                settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);
                return false;
            }

            settings[SettingType.SENSITIVITY].getDelegate().setLoadingState(false);
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);
        }

        if (!this._fetchDataCache) {
            return false;
        }

        let currentEnsemble: FrameworkEnsemble | null = null;
        if (currentEnsembleIdent) {
            currentEnsemble = ensembleSet.findEnsemble(currentEnsembleIdent);
        }
        const sensitivities = currentEnsemble?.getSensitivities()?.getSensitivityArr() ?? [];

        const availableSensitivityPairs: SensitivityNameCasePair[] = [];
        sensitivities.map((sensitivity) =>
            sensitivity.cases.map((sensitivityCase) => {
                availableSensitivityPairs.push({
                    sensitivityName: sensitivity.name,
                    sensitivityCase: sensitivityCase.name,
                });
            })
        );
        this._contextDelegate.setAvailableValues(SettingType.SENSITIVITY, availableSensitivityPairs);

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
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue() !== null
        );
    }
}
