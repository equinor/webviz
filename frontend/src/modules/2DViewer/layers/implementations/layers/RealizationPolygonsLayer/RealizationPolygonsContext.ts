import { PolygonsMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { RealizationPolygonsSettings } from "./types";

import { DefineDependenciesArgs, FetchDataFunctionResult, SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { PolygonsAttribute } from "../../settings/PolygonsAttribute";
import { PolygonsName } from "../../settings/PolygonsName";
import { Realization } from "../../settings/Realization";

export class RealizationPolygonsContext implements SettingsContext<RealizationPolygonsSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationPolygonsSettings>;
    private _fetchDataCache: PolygonsMeta_api[] | null = null;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationPolygonsSettings,
            keyof RealizationPolygonsSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.REALIZATION]: new Realization(),
            [SettingType.POLYGONS_ATTRIBUTE]: new PolygonsAttribute(),
            [SettingType.POLYGONS_NAME]: new PolygonsName(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationPolygonsSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies(
        args: DefineDependenciesArgs<RealizationPolygonsSettings, keyof RealizationPolygonsSettings>
    ): void {}

    async fetchData(
        oldValues: Partial<RealizationPolygonsSettings>,
        newValues: Partial<RealizationPolygonsSettings>
    ): Promise<FetchDataFunctionResult> {
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

        if (currentEnsembleIdent) {
            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(currentEnsembleIdent)
                .getFilteredRealizations();
            this.getDelegate().setAvailableValues(SettingType.REALIZATION, [...realizations]);
        }

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setIsLoading(true);
            settings[SettingType.POLYGONS_NAME].getDelegate().setIsLoading(true);

            try {
                this._fetchDataCache = await queryClient.fetchQuery({
                    queryKey: ["getPolygonsDirectory", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.polygons.getPolygonsDirectory(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                });
            } catch (e) {
                settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setIsLoading(false);
                settings[SettingType.POLYGONS_NAME].getDelegate().setIsLoading(false);
                return FetchDataFunctionResult.ERROR;
            }

            settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setIsLoading(false);
            settings[SettingType.POLYGONS_NAME].getDelegate().setIsLoading(false);
        }

        if (!this._fetchDataCache) {
            return FetchDataFunctionResult.IN_PROGRESS;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.map((polygonsMeta) => polygonsMeta.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.POLYGONS_ATTRIBUTE, availableAttributes);

        const currentAttribute = newValues[SettingType.POLYGONS_ATTRIBUTE];

        const availablePolygonsName: string[] = [];

        if (currentAttribute) {
            availablePolygonsName.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache
                            .filter((polygonsMeta) => polygonsMeta.attribute_name === currentAttribute)
                            .map((el) => el.name)
                    )
                )
            );
        }
        this._contextDelegate.setAvailableValues(SettingType.POLYGONS_NAME, availablePolygonsName);

        return FetchDataFunctionResult.SUCCESS;
    }

    areCurrentSettingsValid(settings: RealizationPolygonsSettings): boolean {
        return (
            settings[SettingType.POLYGONS_ATTRIBUTE] !== null &&
            settings[SettingType.POLYGONS_NAME] !== null &&
            settings[SettingType.REALIZATION] !== null &&
            settings[SettingType.ENSEMBLE] !== null
        );
    }
}
