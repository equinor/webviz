import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { UseQueryResult } from "@tanstack/react-query";

import type { WellboreCasing_api, WellboreHeader_api } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type { EsvLayer } from "@modules/_shared/components/EsvIntersection";
import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import {
    VisualizationItemType,
    type VisualizationGroup,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { TargetViewReturnTypes } from "../components/DataProvidersWrapper";

import { createReferenceLinesLayerItem } from "./createReferenceLines";
import { createWellboreLayerItems } from "./createWellboreLayerItems";

/**
 * Make LayerItems for visualization of a view providers.
 *
 * This function is responsible for creating LayerItems for each provider of a view, and providing them
 * in an array. The items are assigned order based on the order of the providers in the view.
 */
export function makeViewProvidersVisualizationLayerItems(
    view: VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, never>, GroupType>,
    intersectionReferenceSystem: IntersectionReferenceSystem,
): EsvLayer[] {
    // Make EsvLayers per provider, using maker function
    // The children are returned in the order they are added to the view
    const perProviderLayerItems: EsvLayer[][] = [];
    for (const item of view.children) {
        if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            perProviderLayerItems.push(item.visualization.makeLayerItems(intersectionReferenceSystem));
        }
    }

    // Assign ESV layer order, i.e. reverse
    const numProviders = perProviderLayerItems.length;
    for (const [index, providerLayerItems] of perProviderLayerItems.entries()) {
        const layerItemOrder = numProviders - index;
        for (const providerItem of providerLayerItems) {
            (providerItem.options as { order?: number }).order = layerItemOrder;
        }
    }

    // Flatten the array of arrays into a single array
    return perProviderLayerItems.flat();
}

/**
 * Create EsvLayers for the intersection type.
 *
 * This function creates reference lines, and wellbore layers if the intersection type is wellbore.
 */
export function createLayerItemsForIntersectionType(
    intersectionType: IntersectionType,
    intersectionReferenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
    wellboreHeadersQuery: UseQueryResult<WellboreHeader_api[]>,
    wellboreCasingsQuery: UseQueryResult<WellboreCasing_api[]>,
): EsvLayer[] {
    if (intersectionType === IntersectionType.CUSTOM_POLYLINE) {
        const layerItem = createReferenceLinesLayerItem();
        return [layerItem];
    }
    if (intersectionType === IntersectionType.WELLBORE) {
        const layerItems: EsvLayer[] = [];
        if (wellboreHeadersQuery.data && wellboreHeadersQuery.data.length > 0) {
            layerItems.push(
                createReferenceLinesLayerItem({
                    depthReferenceElevation: wellboreHeadersQuery.data[0].depthReferenceElevation,
                    depthReferencePoint: wellboreHeadersQuery.data[0].depthReferencePoint,
                }),
            );
        }

        const wellboreCasingsData =
            wellboreCasingsQuery.data && wellboreCasingsQuery.data.length > 0 ? wellboreCasingsQuery.data : null;
        layerItems.push(...createWellboreLayerItems(wellboreCasingsData, intersectionReferenceSystem, layerOrder));
        return layerItems;
    }

    throw new Error("Unsupported intersection type");
}
