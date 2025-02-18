import { getDepthSliceOptions } from "@api";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSeismicDepthSliceSettingsContext } from "./RealizationSeismicDepthSliceSettingsContext";
import { RealizationSeismicDepthSliceSettings } from "./types";

import { SeismicSliceData_trans, transformSeismicSlice } from "../../../settings/queries/queryDataTransforms";

export class RealizationSeismicDepthSliceLayer
    implements Layer<RealizationSeismicDepthSliceSettings, SeismicSliceData_trans>
{
    private _layerDelegate: LayerDelegate<RealizationSeismicDepthSliceSettings, SeismicSliceData_trans>;
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

    getLayerDelegate(): LayerDelegate<RealizationSeismicDepthSliceSettings, SeismicSliceData_trans> {
        return this._layerDelegate;
    }
    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const settings = this.getSettingsContext().getDelegate().getSettings();
        const seismicDepth = settings[SettingType.SEISMIC_DEPTH_SLICE].getDelegate().getValue();

        if (seismicDepth === null) {
            return null;
        }

        return {
            x: [data.bbox_utm[0][0], data.bbox_utm[1][0]],
            y: [data.bbox_utm[0][1], data.bbox_utm[1][1]],
            z: [seismicDepth, seismicDepth],
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

    fetchData(queryClient: QueryClient): Promise<SeismicSliceData_trans> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const seismicAttribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();

        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
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
                        depth_slice_no: seismicDepth ?? 0,
                    },
                }),
            })
            .then((data) => transformSeismicSlice(data));

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
