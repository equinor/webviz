import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { RealizationPolygonsSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { EnsembleSetting } from "../../settings/EnsembleSetting";
import { PolygonsAttributeSetting } from "../../settings/PolygonsAttributeSetting";
import { PolygonsNameSetting } from "../../settings/PolygonsNameSetting";
import { RealizationSetting } from "../../settings/RealizationSetting";

export class RealizationPolygonsSettingsContext implements SettingsContext<RealizationPolygonsSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationPolygonsSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationPolygonsSettings,
            keyof RealizationPolygonsSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.POLYGONS_ATTRIBUTE]: new PolygonsAttributeSetting(),
            [SettingType.POLYGONS_NAME]: new PolygonsNameSetting(),
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
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

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
