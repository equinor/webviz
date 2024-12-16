import { SurfaceDataPng_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/layers/LayerRegistry";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/layers/_utils/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { StatisticalSurfaceSettingsContext } from "./StatisticalSurfaceSettingsContext";
import { StatisticalSurfaceSettings } from "./types";

import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class StatisticalSurfaceLayer
    implements Layer<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _itemDelegate: ItemDelegate;
    private _layerDelegate: LayerDelegate<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Statistical Surface", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new StatisticalSurfaceSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<StatisticalSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: StatisticalSurfaceSettings,
        newSettings: StatisticalSurfaceSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.transformed_bbox_utm.min_x, data.transformed_bbox_utm.max_x],
            y: [data.transformed_bbox_utm.min_y, data.transformed_bbox_utm.max_y],
            z: [0, 0],
        };
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    fetchData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();
        const workbenchSession = this.getLayerDelegate().getLayerManager().getWorkbenchSession();
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const statisticFunction = settings[SettingType.STATISTIC_FUNCTION].getDelegate().getValue();
        const sensitivityNameCasePair = settings[SettingType.SENSITIVITY].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);

            // Get filtered realizations from workbench
            let filteredRealizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(ensembleIdent)
                .getFilteredRealizations();
            const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);

            // If sensitivity is set, filter realizations further to only include the realizations that are in the sensitivity
            if (sensitivityNameCasePair) {
                const sensitivity = currentEnsemble
                    ?.getSensitivities()
                    ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);

                const sensitivityRealizations = sensitivity?.realizations ?? [];

                filteredRealizations = filteredRealizations.filter((realization) =>
                    sensitivityRealizations.includes(realization)
                );
            }

            // If realizations are filtered, update the address
            const allRealizations = currentEnsemble?.getRealizations() ?? [];
            if (!isEqual([...allRealizations], [...filteredRealizations])) {
                addrBuilder.withStatisticRealizations([...filteredRealizations]);
            }

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }
            addrBuilder.withStatisticFunction(statisticFunction);
            surfaceAddress = addrBuilder.buildStatisticalAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryKey = ["getSurfaceData", surfAddrStr, null, "png"];

        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () => apiService.surface.getSurfaceData(surfAddrStr ?? "", "png", null),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformSurfaceData(data));

        return promise;
    }

    serializeState(): SerializedLayer<StatisticalSurfaceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<StatisticalSurfaceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(StatisticalSurfaceLayer);
