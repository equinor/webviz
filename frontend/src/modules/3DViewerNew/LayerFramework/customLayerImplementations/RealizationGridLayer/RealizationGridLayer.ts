import { getGridParameterOptions, getGridSurfaceOptions } from "@api";
import * as bbox from "@lib/utils/boundingBox";
import * as vec3 from "@lib/utils/vec3";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridSettingsContext } from "./RealizationGridSettingsContext";
import { RealizationGridSettings } from "./types";

export type RealizationGridLayerData = {
    gridSurfaceData: GridSurface_trans;
    gridParameterData: GridMappedProperty_trans;
};

export class RealizationGridLayer implements Layer<RealizationGridSettings, RealizationGridLayerData> {
    private _layerDelegate: LayerDelegate<RealizationGridSettings, RealizationGridLayerData>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Grid", layerManager);
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

    getLayerDelegate(): LayerDelegate<RealizationGridSettings, RealizationGridLayerData> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationGridSettings,
        newSettings: RealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): bbox.BBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        if (!data.gridSurfaceData) {
            return null;
        }

        return bbox.create(
            vec3.create(data.gridSurfaceData.xmin, data.gridSurfaceData.ymin, data.gridSurfaceData.zmin),
            vec3.create(data.gridSurfaceData.xmax, data.gridSurfaceData.ymax, data.gridSurfaceData.zmax)
        );
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        if (data.gridParameterData) {
            return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
        }

        return null;
    }

    fetchData(queryClient: QueryClient): Promise<RealizationGridLayerData> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const parameterName = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        let parameterTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (parameterTimeOrInterval === "NO_TIME") {
            parameterTimeOrInterval = null;
        }
        let availableDimensions = settings[SettingType.GRID_LAYER_K_RANGE].getDelegate().getAvailableValues();
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIRange = settings[SettingType.GRID_LAYER_I_RANGE].getDelegate().getValue();
        const iMin = layerIRange?.[0] ?? 0;
        const iMax = layerIRange?.[1] ?? 0;

        const layerJRange = settings[SettingType.GRID_LAYER_J_RANGE].getDelegate().getValue();
        const jMin = layerJRange?.[0] ?? 0;
        const jMax = layerJRange?.[1] ?? 0;

        const layerKRange = settings[SettingType.GRID_LAYER_K_RANGE].getDelegate().getValue();
        const kMin = layerKRange?.[0] ?? 0;
        const kMax = layerKRange?.[1] ?? 0;

        const queryKey = [
            "gridParameter",
            ensembleIdent,
            gridName,
            parameterName,
            parameterTimeOrInterval,
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
                        parameter_name: parameterName ?? "",
                        parameter_time_or_interval_str: parameterTimeOrInterval,
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
