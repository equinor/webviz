import type { Layer, PickingInfo } from "@deck.gl/core";
/**
 * Subsurface uses the modelMatrix prop to enable vertical scaling on layers, which causes the coordinates to no longer match the real world
 * coordinates (aka "normal" space). Built-in subsurface-comp layers will revert this when picking, but our custom layers do not. Use this
 * utility in getPickingInfo functions to ensure un-scaled coordinates are being used
 * layers
 * @param pick A PickingInfo object from a deck.gl layer
 * @param layerInstance The layer instance that the PickingInfo was generated from
 * @returns A copy of the picking info with the pick-coordinate reverted to normal-space
 */
export function transformPickToNormalSpace<TPickingInfo extends PickingInfo<any, object>>(
    pick: TPickingInfo,
    layerInstance: Layer,
): TPickingInfo {
    if (pick.coordinate && pick.coordinate.length === 3) {
        const modelMatrix = layerInstance.props.modelMatrix;
        const zScale = modelMatrix?.[10] ?? 1;
        const revertedZCoord = pick.coordinate[2] / zScale;

        return {
            ...pick,
            coordinate: pick.coordinate.toSpliced(-1, 1, revertedZCoord),
        };
    }

    return pick;
}
