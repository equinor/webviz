import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/LayerRegistry";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridSettingsContext } from "./RealizationGridSettingsContext";
import { RealizationGridSettings } from "./types";

import { LayerColoringType, LayerDelegate } from "../../../delegates/LayerDelegate";
import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";

export class RealizationGridLayer
    implements
        Layer<
            RealizationGridSettings,
            {
                gridSurfaceData: GridSurface_trans;
                gridParameterData: GridMappedProperty_trans;
            }
        >
{
    private _layerDelegate: LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans;
            gridParameterData: GridMappedProperty_trans;
        }
    >;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Grid layer", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationGridSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<
        RealizationGridSettings,
        {
            gridSurfaceData: GridSurface_trans;
            gridParameterData: GridMappedProperty_trans;
        }
    > {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationGridSettings,
        newSettings: RealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [
                data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmin,
                data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmax,
            ],
            y: [
                data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymin,
                data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymax,
            ],
            z: [data.gridSurfaceData.zmin, data.gridSurfaceData.zmax],
        };
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData(queryClient: QueryClient): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.GRID_ATTRIBUTE].getDelegate().getValue();
        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        let availableDimensions = settings[SettingType.GRID_LAYER].getDelegate().getAvailableValues();
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIndex = settings[SettingType.GRID_LAYER].getDelegate().getValue();
        const iMin = 0;
        const iMax = availableDimensions[0] || 0;
        const jMin = 0;
        const jMax = availableDimensions[1] || 0;
        const kMin = layerIndex || 0;
        const kMax = layerIndex || 0;
        const queryKey = [
            "gridParameter",
            ensembleIdent,
            gridName,
            attribute,
            timeOrInterval,
            realizationNum,
            iMin,
            iMax,
            jMin,
            jMax,
            kMin,
            kMax,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const gridParameterPromise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.grid3D.gridParameter(
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        gridName ?? "",
                        attribute ?? "",
                        realizationNum ?? 0,
                        timeOrInterval,
                        iMin,
                        iMax - 1,
                        jMin,
                        jMax - 1,
                        kMin,
                        kMax
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient
            .fetchQuery({
                queryKey: ["getGridData", ensembleIdent, gridName, realizationNum, iMin, iMax, jMin, jMax, kMin, kMax],
                queryFn: () =>
                    apiService.grid3D.gridSurface(
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        gridName ?? "",
                        realizationNum ?? 0,
                        iMin,
                        iMax - 1,
                        jMin,
                        jMax - 1,
                        kMin,
                        kMax
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }

    serializeState(): SerializedLayer<RealizationGridSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationGridSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationGridLayer);
