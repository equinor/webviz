import type { Layer, PickingInfo } from "@deck.gl/core";

import type { HoverData } from "@framework/HoverService";
import { HoverTopic } from "@framework/HoverService";
import type { PolylinesLayerPickingInfo } from "@modules/_shared/customDeckGlLayers/PolylinesLayer";
import {
    getWellFeatureFromSubLayerData,
    sanitizeMdReadout,
    type ExtendedWellFeature,
    type LayerPickInfoWithReadout,
} from "@modules/_shared/utils/subsurfaceViewerLayers";

import type { UtmFence } from "../fence";
import { makeFenceSourceIdForPolyLine } from "../fence";
import { lengthAlongAtXyPosition } from "../polylineHoverUtils";

export type HoverDataTransformation = <TInfo extends PickingInfo>(layerInfo: TInfo) => Partial<HoverData>;
export type LayerCtor = typeof Layer<any>;
export type HoverTransformTuple = [LayerCtor, HoverDataTransformation];

/**
 * A mapping to transform deck.gl PickingInfo into hover data on a per-layer basis.
 */
export type LayerTransformationLookupMap = ReadonlyMap<LayerCtor, HoverDataTransformation>;

/** Utility to create a read-only look-up for one or more picking transformations */
export function makeHoverTransformationLookup(
    ...hoverTransformations: HoverTransformTuple[]
): LayerTransformationLookupMap {
    return new Map([...hoverTransformations]);
}

export function transformToWellboreHoverData(
    wellInfo: LayerPickInfoWithReadout<ExtendedWellFeature>,
): Partial<HoverData> {
    const wellFeature = getWellFeatureFromSubLayerData(wellInfo);

    const mdProperty = wellInfo?.readout?.properties?.find((prop) => prop.name === "MD");

    const wellboreUuid = wellFeature?.properties.uuid;
    const mdReadout = sanitizeMdReadout(mdProperty?.value);

    if (!wellboreUuid || mdReadout == null) return {};

    return {
        [HoverTopic.WELLBORE]: wellboreUuid,
        [HoverTopic.WELLBORE_MD]: { wellboreUuid, md: mdReadout },
    };
}

export function transformToWorldPosHoverData(info: PickingInfo): Partial<HoverData> {
    if (!info.coordinate) return {};

    const [x, y, z] = info.coordinate;

    return {
        [HoverTopic.WORLD_POS_UTM]: { x, y, z },
    };
}

type PickWithFenceInfo = PickingInfo & { sourceFence?: UtmFence; lengthAlongFence?: number; fenceDepth?: number };

export function transformToFenceHoverData(fenceInfo: PickWithFenceInfo): Partial<HoverData> {
    const fenceId = fenceInfo.sourceFence?.id;
    const lengthAlong = fenceInfo.lengthAlongFence;
    const depth = fenceInfo.fenceDepth ?? null;

    if (!fenceId || lengthAlong == null) return {};

    return {
        [HoverTopic.FENCE]: { fenceId, lengthAlong, depth },
    };
}

export function transformPolylineToFenceHoverData(fenceInfo: PolylinesLayerPickingInfo) {
    if (!fenceInfo.polylineId || !fenceInfo.coordinate || !fenceInfo.object) return {};

    const [fenceX, fenceY, fenceZ] = fenceInfo.coordinate;
    const fenceId = makeFenceSourceIdForPolyLine(fenceInfo.polylineId);
    const lengthAlong = lengthAlongAtXyPosition(fenceInfo.object.path, fenceX, fenceY);
    const depth = -fenceZ;

    return {
        [HoverTopic.FENCE]: { fenceId, lengthAlong, depth },
    };
}

export function findFirstMatchingTransformation(
    transformationLookup: LayerTransformationLookupMap,
    layerCtor: LayerCtor,
): HoverDataTransformation | undefined {
    let current = layerCtor;

    while (current) {
        if (transformationLookup.has(current)) {
            return transformationLookup.get(current);
        }

        current = Object.getPrototypeOf(current.prototype)?.constructor;
    }

    return undefined;
}
