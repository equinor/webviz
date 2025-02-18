import { getCrosslineSliceOptions } from "@api";
import { rotatePoint2Around } from "@lib/utils/vec2";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox, Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSeismicCrosslineSettingsContext } from "./RealizationSeismicCrosslineSettingsContext";
import { RealizationSeismicCrosslineSettings, RealizationSeismicCrosslineStoredData } from "./types";

import { SeismicSliceData_trans, transformSeismicSlice } from "../../../settings/queries/queryDataTransforms";

export class RealizationSeismicCrosslineLayer
    implements
        Layer<RealizationSeismicCrosslineSettings, SeismicSliceData_trans, RealizationSeismicCrosslineStoredData>
{
    private _layerDelegate: LayerDelegate<
        RealizationSeismicCrosslineSettings,
        SeismicSliceData_trans,
        RealizationSeismicCrosslineStoredData
    >;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Seismic Crossline (realization)", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationSeismicCrosslineSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate() {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationSeismicCrosslineSettings,
        newSettings: RealizationSeismicCrosslineSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.bbox_utm[0][0], data.bbox_utm[1][0]],
            y: [data.bbox_utm[0][1], data.bbox_utm[1][1]],
            z: [data.u_min, data.u_max],
        };
    }

    predictBoundingBox(): BoundingBox | null {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const seismicCrosslineNumber = settings[SettingType.SEISMIC_CROSSLINE].getDelegate().getValue();
        const seismicAttribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        const isoTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const seismicCubeMeta = this._layerDelegate.getSettingsContext().getDelegate().getStoredData("seismicCubeMeta");

        if (!seismicCubeMeta || !seismicCrosslineNumber) {
            return null;
        }

        const meta = seismicCubeMeta.find(
            (m) => m.seismicAttribute === seismicAttribute && m.isoDateOrInterval === isoTimeOrInterval
        );

        if (!meta) {
            return null;
        }

        const xmin = meta.spec.xOrigin;
        const xmax = meta.spec.xOrigin + meta.spec.xInc * (meta.spec.numCols - 1);

        const ymin = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * seismicCrosslineNumber;
        const ymax = ymin;

        const zmin = meta.spec.zOrigin;
        const zmax = meta.spec.zOrigin + meta.spec.zInc * meta.spec.zFlip * (meta.spec.numLayers - 1);

        const maxXY = { x: xmax, y: ymax };
        const minXY = { x: xmin, y: ymin };
        const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

        const rotatedMinXY = rotatePoint2Around(minXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);
        const rotatedMaxXY = rotatePoint2Around(maxXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);

        return { x: [rotatedMinXY.x, rotatedMaxXY.x], y: [rotatedMinXY.y, rotatedMaxXY.y], z: [zmin, zmax] };
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
        const seismicCrosslineNumber = settings[SettingType.SEISMIC_CROSSLINE].getDelegate().getValue();

        const queryOptions = getCrosslineSliceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
                seismic_attribute: seismicAttribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: false,
                crossline_no: seismicCrosslineNumber ?? 0,
            },
        });

        this._layerDelegate.registerQueryKey(queryOptions.queryKey);

        const seismicSlicePromise = queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => transformSeismicSlice(data));

        return seismicSlicePromise;
    }

    serializeState(): SerializedLayer<RealizationSeismicCrosslineSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationSeismicCrosslineSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationSeismicCrosslineLayer);
