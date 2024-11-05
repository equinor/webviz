import { PolygonData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/LayerRegistry";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationPolygonsContext } from "./RealizationPolygonsContext";
import { RealizationPolygonsSettings } from "./types";

import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class RealizationPolygonsLayer implements Layer<RealizationPolygonsSettings, PolygonData_api[]> {
    private _layerDelegate: LayerDelegate<RealizationPolygonsSettings, PolygonData_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Polygons", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationPolygonsContext(layerManager),
            LayerColoringType.NONE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationPolygonsSettings, PolygonData_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationPolygonsSettings,
        newSettings: RealizationPolygonsSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const bbox: BoundingBox = {
            x: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            y: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
            z: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        };

        for (const polygon of data) {
            for (const point of polygon.x_arr) {
                bbox.x[0] = Math.min(bbox.x[0], point);
                bbox.x[1] = Math.max(bbox.x[1], point);
            }
            for (const point of polygon.y_arr) {
                bbox.y[0] = Math.min(bbox.y[0], point);
                bbox.y[1] = Math.max(bbox.y[1], point);
            }
            for (const point of polygon.z_arr) {
                bbox.z[0] = Math.min(bbox.z[0], point);
                bbox.z[1] = Math.max(bbox.z[1], point);
            }
        }

        return bbox;
    }

    fechData(queryClient: QueryClient): Promise<PolygonData_api[]> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const polygonsName = settings[SettingType.POLYGONS_NAME].getDelegate().getValue();
        const polygonsAttribute = settings[SettingType.POLYGONS_ATTRIBUTE].getDelegate().getValue();

        const queryKey = [
            "getPolygonsData",
            ensembleIdent?.getCaseUuid() ?? "",
            ensembleIdent?.getEnsembleName() ?? "",
            realizationNum ?? 0,
            polygonsName ?? "",
            polygonsAttribute ?? "",
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
                apiService.polygons.getPolygonsData(
                    ensembleIdent?.getCaseUuid() ?? "",
                    ensembleIdent?.getEnsembleName() ?? "",
                    realizationNum ?? 0,
                    polygonsName ?? "",
                    polygonsAttribute ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        return promise;
    }

    serializeState(): SerializedLayer<RealizationPolygonsSettings> {
        const id = this._itemDelegate.getId();
        const name = this._itemDelegate.getName();
        return this._layerDelegate.serializeState(id, name);
    }

    deserializeState(serializedState: SerializedLayer<RealizationPolygonsSettings>): void {
        this._itemDelegate.setId(serializedState.id);
        this._itemDelegate.setName(serializedState.name);
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationPolygonsLayer);
