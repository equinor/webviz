import { PolygonsAttributeType_api, PolygonsMeta_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { isEqual } from "lodash";

import { RealizationPolygonsSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { PolygonsAttribute } from "../../settings/PolygonsAttribute";
import { PolygonsName } from "../../settings/PolygonsName";
import { Realization } from "../../settings/Realization";

export class RealizationPolygonsContext implements SettingsContext<RealizationPolygonsSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationPolygonsSettings>;
    private _fetchDataCache: PolygonsMeta_api[] | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationPolygonsSettings,
            keyof RealizationPolygonsSettings
        >(this, {
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

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.POLYGONS_NAME].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.map((polygonsMeta) => polygonsMeta.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.POLYGONS_ATTRIBUTE, availableAttributes);

        let currentAttribute = settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().getValue();
        if (!currentAttribute || !availableAttributes.includes(currentAttribute)) {
            if (availableAttributes.length > 0) {
                currentAttribute = availableAttributes[0];
                settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setValue(currentAttribute);
            }
        }

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

        let currentPolygonsName = settings[SettingType.POLYGONS_NAME].getDelegate().getValue();
        if (!currentPolygonsName || !availablePolygonsName.includes(currentPolygonsName)) {
            if (availablePolygonsName.length > 0) {
                currentPolygonsName = availablePolygonsName[0];
                settings[SettingType.POLYGONS_NAME].getDelegate().setValue(currentPolygonsName);
            }
        }
    }

    fetchData(oldValues: RealizationPolygonsSettings, newValues: RealizationPolygonsSettings): void {
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

            settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.POLYGONS_NAME].getDelegate().setLoadingState(true);

            queryClient
                .fetchQuery({
                    queryKey: ["getPolygonsDirectory", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.polygons.getPolygonsDirectory(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: PolygonsMeta_api[]) => {
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
            settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.POLYGONS_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.REALIZATION].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null
        );
    }
}
