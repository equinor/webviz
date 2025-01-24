import { SurfaceDataPng_api, getCrosslineSliceOptions, getDepthSliceOptions } from "@api";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSeismicDepthSliceSettingsContext } from "./RealizationSeismicDepthSliceSettingsContext";
import { RealizationSeismicDepthSliceSettings } from "./types";

import { SeismicCrosslineData_trans, transformSeismicCrossline } from "../../../settings/queries/queryDataTransforms";

export class RealizationSeismicDepthSliceLayer
    implements Layer<RealizationSeismicDepthSliceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<
        RealizationSeismicDepthSliceSettings,
        SurfaceDataFloat_trans | SurfaceDataPng_api
    >;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Seismic depth slice (realization)", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationSeismicDepthSliceSettingsContext(layerManager),
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
        RealizationSeismicDepthSliceSettings,
        SurfaceDataFloat_trans | SurfaceDataPng_api
    > {
        return this._layerDelegate;
    }
    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.transformed_bbox_utm.min_x, data.transformed_bbox_utm.max_x],
            y: [data.transformed_bbox_utm.min_y, data.transformed_bbox_utm.max_y],
            z: [data.value_min, data.value_max],
        };
    }
    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationSeismicDepthSliceSettings,
        newSettings: RealizationSeismicDepthSliceSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    fetchData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const seismicAttribute = settings[SettingType.SEISMIC_ATTRIBUTE].getDelegate().getValue();

        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const seismicDepth = settings[SettingType.SEISMIC_DEPTH_SLICE].getDelegate().getValue();

        const queryKey = [
            "RealizationSeismicDepthSliceSlice",
            ensembleIdent,
            seismicAttribute,
            timeOrInterval,
            realizationNum,
            seismicDepth,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const seismicSlicePromise = queryClient
            .fetchQuery({
                ...getDepthSliceOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        realization_num: realizationNum ?? 0,
                        seismic_attribute: seismicAttribute ?? "",
                        time_or_interval_str: timeOrInterval ?? "",
                        observed: false,
                        depth: seismicDepth ?? 0,
                    },
                }),
            })
            .then((data) => transformSurfaceData(data));

        return seismicSlicePromise;
    }

    serializeState(): SerializedLayer<RealizationSeismicDepthSliceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationSeismicDepthSliceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationSeismicDepthSliceLayer);
