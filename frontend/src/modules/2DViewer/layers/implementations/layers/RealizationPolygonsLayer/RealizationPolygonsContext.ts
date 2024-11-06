import { PolygonsMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { RealizationPolygonsSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
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

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(ensembleIdent)
                .getFilteredRealizations();

            return [...realizations];
        });

        const realizationPolygonsMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                queryKey: ["getRealizationPolygonsMetadata", ensembleIdent],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.polygons.getPolygonsDirectory(
                            ensembleIdent.getCaseUuid(),
                            ensembleIdent.getEnsembleName()
                        ),
                        abortSignal
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        });

        availableSettingsUpdater(SettingType.POLYGONS_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.map((polygonsMeta) => polygonsMeta.attribute_name))),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(SettingType.POLYGONS_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(SettingType.POLYGONS_ATTRIBUTE);
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.filter((polygonsMeta) => polygonsMeta.attribute_name === attribute).map((el) => el.name)
                    )
                ),
            ];

            return availableSurfaceNames;
        });
    }
}
