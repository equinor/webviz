import { getDepthSliceOptions } from "@api";
import * as bbox from "@lib/utils/boundingBox";
import { Geometry, GeometryType } from "@lib/utils/geometry";
import { rotatePoint2Around } from "@lib/utils/vec2";
import * as vec3 from "@lib/utils/vec3";
import { ItemDelegate } from "@modules/_shared/LayerFramework/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/_shared/LayerFramework/delegates/LayerDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { Layer, SerializedLayer } from "@modules/_shared/LayerFramework/interfaces";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSeismicDepthSliceSettingsContext } from "./RealizationSeismicDepthSliceSettingsContext";
import { RealizationSeismicDepthSliceSettings, RealizationSeismicDepthSliceStoredData } from "./types";

import { SeismicSliceData_trans, transformSeismicSlice } from "../../../settings/queries/queryDataTransforms";

export class RealizationSeismicDepthSliceLayer
    implements
        Layer<RealizationSeismicDepthSliceSettings, SeismicSliceData_trans, RealizationSeismicDepthSliceStoredData>
{
    private _layerDelegate: LayerDelegate<
        RealizationSeismicDepthSliceSettings,
        SeismicSliceData_trans,
        RealizationSeismicDepthSliceStoredData
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
        SeismicSliceData_trans,
        RealizationSeismicDepthSliceStoredData
    > {
        return this._layerDelegate;
    }

    makeBoundingBox(): bbox.BBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        const settings = this.getSettingsContext().getDelegate().getSettings();
        const seismicDepth = settings[SettingType.SEISMIC_DEPTH_SLICE].getDelegate().getValue();

        if (seismicDepth === null) {
            return null;
        }

        // The endpoint returns the bounding box as four points
        return bbox.create(
            vec3.create(
                Math.min(...data.bbox_utm.map((point) => point[0])),
                Math.min(...data.bbox_utm.map((point) => point[1])),
                seismicDepth
            ),
            vec3.create(
                Math.max(...data.bbox_utm.map((point) => point[0])),
                Math.max(...data.bbox_utm.map((point) => point[1])),
                seismicDepth
            )
        );
    }

    predictNextGeometryAndBoundingBox(): [Geometry, bbox.BBox] | null {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const seismicDepthSliceNumber = settings[SettingType.SEISMIC_DEPTH_SLICE].getDelegate().getValue();
        const seismicAttribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        const isoTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const seismicCubeMeta = this._layerDelegate.getSettingsContext().getDelegate().getStoredData("seismicCubeMeta");

        if (!seismicCubeMeta || seismicDepthSliceNumber === null) {
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

        const ymin = meta.spec.yOrigin;
        const ymax = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * (meta.spec.numRows - 1);

        const zmin = -seismicDepthSliceNumber;
        const zmax = zmin;

        const maxXY = { x: xmax, y: ymax };
        const minXY = { x: xmin, y: ymin };
        const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

        const rotatedMinXY = rotatePoint2Around(minXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);
        const rotatedMaxXY = rotatePoint2Around(maxXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);

        const boundingBox = bbox.create(
            vec3.create(Math.min(rotatedMinXY.x, rotatedMaxXY.x), Math.min(rotatedMinXY.y, rotatedMaxXY.y), zmin),
            vec3.create(Math.max(rotatedMinXY.x, rotatedMaxXY.x), Math.max(rotatedMinXY.y, rotatedMaxXY.y), zmax)
        );

        const geometry: Geometry = {
            type: GeometryType.POLYGON,
            points: [
                vec3.create(rotatedMinXY.x, rotatedMinXY.y, zmin),
                vec3.create(rotatedMaxXY.x, rotatedMaxXY.y, zmin),
                vec3.create(rotatedMaxXY.x, rotatedMaxXY.y, zmax),
                vec3.create(rotatedMinXY.x, rotatedMinXY.y, zmax),
            ],
        };

        return [geometry, boundingBox];
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
