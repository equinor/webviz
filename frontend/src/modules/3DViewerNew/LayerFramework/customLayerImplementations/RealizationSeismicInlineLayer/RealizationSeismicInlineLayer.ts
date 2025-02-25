import { getInlineSliceOptions } from "@api";
import * as bbox from "@lib/utils/boundingBox";
import { Geometry, ShapeType } from "@lib/utils/geometry";
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

import { RealizationSeismicInlineSettingsContext } from "./RealizationSeismicInlineSettingsContext";
import { RealizationSeismicInlineSettings, RealizationSeismicInlineSliceStoredData } from "./types";

import { SeismicSliceData_trans, transformSeismicSlice } from "../../../settings/queries/queryDataTransforms";

export class RealizationSeismicInlineLayer
    implements Layer<RealizationSeismicInlineSettings, SeismicSliceData_trans, RealizationSeismicInlineSliceStoredData>
{
    private _layerDelegate: LayerDelegate<
        RealizationSeismicInlineSettings,
        SeismicSliceData_trans,
        RealizationSeismicInlineSliceStoredData
    >;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Seismic Inline (realization)", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationSeismicInlineSettingsContext(layerManager),
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
        RealizationSeismicInlineSettings,
        SeismicSliceData_trans,
        RealizationSeismicInlineSliceStoredData
    > {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationSeismicInlineSettings,
        newSettings: RealizationSeismicInlineSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox(): bbox.BBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return bbox.create(
            vec3.create(data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_min),
            vec3.create(data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_max)
        );
    }

    predictNextGeometry(): Geometry | null {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const seismicInlineNumber = settings[SettingType.SEISMIC_INLINE].getDelegate().getValue();
        const seismicAttribute = settings[SettingType.ATTRIBUTE].getDelegate().getValue();
        const isoTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        const seismicCubeMeta = this._layerDelegate.getSettingsContext().getDelegate().getStoredData("seismicCubeMeta");

        if (!seismicCubeMeta || seismicInlineNumber === null) {
            return null;
        }

        const meta = seismicCubeMeta.find(
            (m) => m.seismicAttribute === seismicAttribute && m.isoDateOrInterval === isoTimeOrInterval
        );

        if (!meta) {
            return null;
        }

        const xmin = meta.spec.xOrigin + meta.spec.yInc * seismicInlineNumber;
        const xmax = xmin;

        const ymin = meta.spec.yOrigin;
        const ymax = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * (meta.spec.numRows - 1);

        const zmin = meta.spec.zOrigin;
        const zmax = meta.spec.zOrigin + meta.spec.zInc * meta.spec.zFlip * (meta.spec.numLayers - 1);

        const maxXY = { x: xmax, y: ymax };
        const minXY = { x: xmin, y: ymin };
        const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

        const rotatedMinXY = rotatePoint2Around(minXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);
        const rotatedMaxXY = rotatePoint2Around(maxXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);

        const geometry: Geometry = {
            shapes: [
                {
                    type: ShapeType.RECTANGLE,
                    centerPoint: vec3.create(
                        (rotatedMinXY.x + rotatedMaxXY.x) / 2,
                        (rotatedMinXY.y + rotatedMaxXY.y) / 2,
                        (zmin + zmax) / 2
                    ),
                    dimensions: {
                        width: vec3.length(
                            vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0)
                        ),
                        height: Math.abs(zmax - zmin),
                    },
                    normalizedEdgeVectors: {
                        u: vec3.normalize(
                            vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0)
                        ),
                        v: vec3.create(0, 0, 1),
                    },
                },
            ],
            boundingBox: bbox.create(
                vec3.create(Math.min(rotatedMinXY.x, rotatedMaxXY.x), Math.min(rotatedMinXY.y, rotatedMaxXY.y), zmin),
                vec3.create(Math.max(rotatedMinXY.x, rotatedMaxXY.x), Math.max(rotatedMinXY.y, rotatedMaxXY.y), zmax)
            ),
        };

        return geometry;
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
        const seismicInlineNumber = settings[SettingType.SEISMIC_INLINE].getDelegate().getValue();

        const queryKey = [
            "realizationSeismicInlineSlice",
            ensembleIdent,
            seismicAttribute,
            timeOrInterval,
            realizationNum,
            seismicInlineNumber,
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const seismicSlicePromise = queryClient
            .fetchQuery({
                ...getInlineSliceOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        realization_num: realizationNum ?? 0,
                        seismic_attribute: seismicAttribute ?? "",
                        time_or_interval_str: timeOrInterval ?? "",
                        observed: false,
                        inline_no: seismicInlineNumber ?? 0,
                    },
                }),
            })
            .then((data) => transformSeismicSlice(data));

        return seismicSlicePromise;
    }

    serializeState(): SerializedLayer<RealizationSeismicInlineSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationSeismicInlineSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationSeismicInlineLayer);
