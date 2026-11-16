import type { GetPickingInfoParams } from "@deck.gl/core";
import type { LayerPickInfo } from "@webviz/subsurface-viewer";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

/**
 * Map layer for depth surfaces.
 *
 * A depth surface only carries a single value per node (the depth), but the
 * base {@link MapLayer} always emits both a "Depth" and a "Property" readout.
 * Since both describe the same underlying value this is confusing for the user,
 * so we strip the redundant "Property" entry and keep only the depth value in
 * the readout box.
 */
export class DepthSurfaceLayer<ExtraProps extends object = object> extends MapLayer<ExtraProps> {
    static layerName: string = "DepthSurfaceLayer";

    getPickingInfo(params: GetPickingInfoParams): LayerPickInfo {
        const info = super.getPickingInfo(params) as LayerPickInfo;

        if (Array.isArray(info.properties)) {
            info.properties = info.properties.filter((property) => property.name !== "Property");
        }

        return info;
    }
}
