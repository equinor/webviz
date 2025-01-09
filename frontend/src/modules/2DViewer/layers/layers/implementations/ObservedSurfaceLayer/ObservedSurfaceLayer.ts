import { SurfaceDataPng_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/layers/LayerRegistry";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/layers/_utils/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { ObservedSurfaceSettingsContext } from "./ObservedSurfaceSettingsContext";
import { ObservedSurfaceSettings } from "./types";

import { LayerColoringType, LayerDelegate } from "../../../delegates/LayerDelegate";
import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class ObservedSurfaceLayer
    implements Layer<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Observed Surface", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new ObservedSurfaceSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: ObservedSurfaceSettings,
        newSettings: ObservedSurfaceSettings
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
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute && timeOrInterval) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withTimeOrInterval(timeOrInterval);

            surfaceAddress = addrBuilder.buildObservedAddress();
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

    serializeState(): SerializedLayer<ObservedSurfaceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<ObservedSurfaceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(ObservedSurfaceLayer);
