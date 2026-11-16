import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { UseQueryResult } from "@tanstack/react-query";

import type { WellboreCasing_api, WellboreHeader_api } from "@api";
import { IntersectionType, isWellboreIntersectionType } from "@framework/types/intersection";
import type { EsvLayer } from "@modules/_shared/components/EsvIntersection";
import { PLANNED_WELL_COLOR_CSS } from "@modules/_shared/constants/wellsLayer";
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
    const providerItems = view.children.filter(
        (item) => item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION,
    );
    const numProviders = providerItems.length;
    return providerItems.flatMap((item, index) =>
        item.visualization.makeLayerItems(intersectionReferenceSystem, numProviders - index),
    );
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
    if (isWellboreIntersectionType(intersectionType)) {
        const layerItems: EsvLayer[] = [];

        // Planned wellbores are not yet drilled, so they have neither precise depth-reference metadata
        // nor casing data; fall back to a default reference line and omit casings for them.
        const isPlanned = intersectionType === IntersectionType.PLANNED_WELLBORE;

        if (!isPlanned && wellboreHeadersQuery.data && wellboreHeadersQuery.data.length > 0) {
            layerItems.push(
                createReferenceLinesLayerItem({
                    depthReferenceElevation: wellboreHeadersQuery.data[0].depthReferenceElevation,
                    depthReferencePoint: wellboreHeadersQuery.data[0].depthReferencePoint,
                }),
            );
        } else {
            layerItems.push(createReferenceLinesLayerItem());
        }

        const wellboreCasingsData =
            !isPlanned && wellboreCasingsQuery.data && wellboreCasingsQuery.data.length > 0
                ? wellboreCasingsQuery.data
                : null;
        const pathStroke = isPlanned ? PLANNED_WELL_COLOR_CSS : undefined;
        layerItems.push(
            ...createWellboreLayerItems(wellboreCasingsData, intersectionReferenceSystem, layerOrder, pathStroke),
        );
        return layerItems;
    }

    throw new Error("Unsupported intersection type");
}
