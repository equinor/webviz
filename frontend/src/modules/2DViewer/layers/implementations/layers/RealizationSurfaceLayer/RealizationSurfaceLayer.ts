import { SurfaceDataPng_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/LayerRegistry";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSurfaceSettingsContext } from "./RealizationSurfaceSettingsContext";
import { RealizationSurfaceSettings } from "./types";

import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class RealizationSurfaceLayer
    implements Layer<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Surface", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationSurfaceSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationSurfaceSettings,
        newSettings: RealizationSurfaceSettings
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

        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute && realizationNum !== null) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withRealization(realizationNum);

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }

            surfaceAddress = addrBuilder.buildRealizationAddress();
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

    serializeState(): SerializedLayer<RealizationSurfaceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationSurfaceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationSurfaceLayer);
