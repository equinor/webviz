import type { Layer, PickingInfo } from "@deck.gl/core";

import type { HoverData } from "@framework/HoverService";
import { HoverTopic } from "@framework/HoverService";
import {
    getWellFeatureFromSubLayerData,
    sanitizeMdReadout,
    type ExtendedWellFeature,
    type LayerPickInfoWithReadout,
} from "@modules/_shared/utils/subsurfaceViewerLayers";

export type HoverDataTransformation = <TInfo extends PickingInfo>(layerInfo: TInfo) => Partial<HoverData>;
export type LayerCtor = abstract new () => Layer<any>;
export type HoverTransformTuple = [LayerCtor, HoverDataTransformation];

/**
 * A mapping to transform deck.gl PickingInfo into hover data on a per-layer basis.
 */

/** Utility to create a read-only look-up for one or more picking transformations */
export function makeHoverTransformationLookup(
    ...hoverTransformations: HoverTransformTuple[]
): LayerTransformationLookupMap {
    return new Map([...hoverTransformations]);
}

export function getWellboreData(wellInfo: LayerPickInfoWithReadout<ExtendedWellFeature>): Partial<HoverData> {
    const wellFeature = getWellFeatureFromSubLayerData(wellInfo);

    const mdProperty = wellInfo?.readout?.properties?.find((prop) => prop.name === "MD");

    const wellboreUuid = wellFeature?.properties.uuid;
    const mdReadout = sanitizeMdReadout(mdProperty?.value);

    if (!wellboreUuid || !mdReadout) return {};

    return {
        [HoverTopic.WELLBORE]: wellboreUuid,
        [HoverTopic.WELLBORE_MD]: { wellboreUuid, md: mdReadout },
    };
}

export function getWorldPosition(info: PickingInfo): Partial<HoverData> {
    if (!info.coordinate) return {};

    const [x, y, z] = info.coordinate;

    return {
        [HoverTopic.WORLD_POS_UTM]: { x, y, z },
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
