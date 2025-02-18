import { getGridParameterOptions, getGridSurfaceOptions } from "@api";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridSettingsContext } from "./RealizationGridSettingsContext";
import { RealizationGridSettings } from "./types";

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
        const attribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        let availableDimensions = settings[SettingType.GRID_LAYER_K].getDelegate().getAvailableValues();
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIndex = settings[SettingType.GRID_LAYER_K].getDelegate().getValue();
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
                ...getGridParameterOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        parameter_name: attribute ?? "",
                        parameter_time_or_interval_str: timeOrInterval,
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
            })
            .then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient
            .fetchQuery({
                ...getGridSurfaceOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
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
