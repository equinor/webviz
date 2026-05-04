import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { UseQueryResult } from "@tanstack/react-query";
import { isEqual } from "lodash";

import type { WellboreHeader_api } from "@api";
import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { IntersectionType } from "@framework/types/intersection";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import { isColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { isValidBounds } from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type {
    VisualizationGroup,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { Interfaces } from "@modules/Intersection/interfaces";
import type { TargetViewReturnTypes } from "@modules/Intersection/view/components/DataProvidersWrapper";

type ViewGroup = VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, never>, GroupType>;

import { useWellboreCasingsQuery } from "../hooks/queryHooks";
import { useCreateIntersectionReferenceSystem } from "../hooks/useIntersectionReferenceSystem";
import { createBBoxForWellborePath } from "../utils/boundingBoxUtils";
import {
    createBoundsForIntersectionReferenceSystem,
    createBoundsForIntersectionView,
    DEFAULT_INTERSECTION_VIEW_BOUNDS,
} from "../utils/boundsUtils";
import { createIntersectionSourceKey } from "../utils/createIntersectionSourceKey";
import {
    createLayerItemsForIntersectionType,
    makeViewProvidersVisualizationLayerItems,
} from "../utils/createLayerItemsUtils";

import { ViewportWrapper } from "./ViewportWrapper";

export type ViewDataProcessorProps = {
    view: VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, any>, GroupType>;
    fieldIdentifier: string | null;
    isLoading: boolean;
    wellboreHeadersQuery: UseQueryResult<WellboreHeader_api[]>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    hoverService: HoverService;
    viewContext: ViewContext<Interfaces>;
};

/**
 * Wrapper component compute intersection view information – like bounds and reference systems.
 */
export function ViewDataProcessor(props: ViewDataProcessorProps): React.ReactNode {
    const { view, fieldIdentifier, wellboreHeadersQuery } = props;

    const viewIntersection = view.customProps?.intersection ?? null;

    const wellboreUuid = viewIntersection?.type === IntersectionType.WELLBORE ? viewIntersection.uuid : null;
    const wellboreCasingsQuery = useWellboreCasingsQuery(wellboreUuid);

    // Create intersection reference system for view
    const intersectionReferenceSystem: IntersectionReferenceSystem | null = useCreateIntersectionReferenceSystem(
        viewIntersection,
        fieldIdentifier ?? null,
        props.workbenchSession,
    );

    const dataIsReady = useDataIsReady(view);
    const dataBounds = useDataBounds(dataIsReady, view, intersectionReferenceSystem);
    const focusBounds = useFocusBounds(dataIsReady, view, intersectionReferenceSystem);

    // Cache visualization layer items to prevent layers from popping in/out during transient loading states.
    // - The DataProviderFramework enters a loading state for all data providers in a view when shared
    //   settings change (e.g. the Intersection setting) or when views are reordered/added/removed - even if
    //   underlying query results are already cached. This causes layers list to temporarily omit layers,
    //   resulting EsvIntersection to remove and re-add as new instances. Re-adding triggers expensive init
    //   that blocks the UI.
    const cachedVisualizationLayerItemsRef = React.useRef<LayerItem[]>([]);

    // Invalidate the cache when the intersection source changes so we don't keep showing
    // layers computed for the previous source while new data is loading.
    const intersectionSourceKey = createIntersectionSourceKey(viewIntersection);
    const previousIntersectionSourceKeyRef = React.useRef<string | null>(intersectionSourceKey);
    if (previousIntersectionSourceKeyRef.current !== intersectionSourceKey) {
        previousIntersectionSourceKeyRef.current = intersectionSourceKey;
        cachedVisualizationLayerItemsRef.current = [];
    }

    // Make layer items for the view providers using intersection reference system
    const newVisualizationLayerItems: LayerItem[] = [];
    if (view && intersectionReferenceSystem) {
        // LayerItem elements for the view providers
        newVisualizationLayerItems.push(
            ...makeViewProvidersVisualizationLayerItems(view as ViewGroup, intersectionReferenceSystem),
        );
    }

    // Only update cached provider layer items when no providers are loading
    const hasLoadingProviders = (view.numLoadingDataProviders ?? 0) > 0;
    if (!hasLoadingProviders) {
        cachedVisualizationLayerItemsRef.current = newVisualizationLayerItems;
    }

    // Use cached items when providers are loading, fresh items otherwise
    const visualizationLayerItems: LayerItem[] = hasLoadingProviders
        ? [...cachedVisualizationLayerItemsRef.current]
        : [...newVisualizationLayerItems];

    // Create elements based on intersection type
    // - LayerItems for intersection type
    // - Bounding box for wellbore path
    if (viewIntersection && intersectionReferenceSystem) {
        // Place layers on top of view provider layers
        const intersectionTypeLayerOrder = visualizationLayerItems.length + 1;
        visualizationLayerItems.push(
            ...createLayerItemsForIntersectionType(
                viewIntersection.type,
                intersectionReferenceSystem,
                intersectionTypeLayerOrder,
                wellboreHeadersQuery,
                wellboreCasingsQuery,
            ),
        );
    }

    const layerIdToNameMap = Object.fromEntries(visualizationLayerItems.map((layer) => [layer.id, layer.name]));
    const colorScales = view.annotations.filter((elm) => isColorScaleWithId(elm)) ?? [];

    if (!viewIntersection) {
        return null;
    }

    return (
        <ViewportWrapper
            viewId={view.id}
            name={view.name}
            color={view.color}
            referenceSystem={intersectionReferenceSystem ?? undefined}
            layerItems={visualizationLayerItems}
            layerItemIdToNameMap={layerIdToNameMap}
            layerItemsBounds={dataBounds}
            focusBounds={focusBounds}
            colorScales={colorScales}
            workbenchServices={props.workbenchServices}
            hoverService={props.hoverService}
            viewContext={props.viewContext}
            intersectionSource={viewIntersection}
        />
    );
}

/**
 * Checks if the view's provider data is ready to be aggregated.
 */
function useDataIsReady(
    view: VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, any>, GroupType>,
) {
    // Consider if we should check anything else to define "data is ready"
    const dataIsReady = (view.numLoadingDataProviders ?? 0) === 0;

    return dataIsReady;
}

/**
 * Computes the x/y bounds that contains all data in the view layers
 */
function useDataBounds(
    dataIsReady: boolean,
    view: VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, any>, GroupType>,
    intersectionReferenceSystem: IntersectionReferenceSystem | null,
) {
    const [dataBounds, setDataBounds] = React.useState<Bounds>(DEFAULT_INTERSECTION_VIEW_BOUNDS);

    const viewIntersection = view.customProps?.intersection ?? null;
    const viewExtensionLength = view.customProps?.extensionLength ?? 0;

    if (dataIsReady) {
        // Create data bounds for the layers, by use of bounding box for the visualization layers (per-view)
        let combinedBbox: BBox | null = null;

        if (viewIntersection && intersectionReferenceSystem) {
            if (viewIntersection.type === IntersectionType.WELLBORE) {
                const wellborePathBoundingBox = createBBoxForWellborePath(
                    intersectionReferenceSystem.projectedPath,
                    viewExtensionLength,
                );

                combinedBbox = combineNullableBBox(combinedBbox, wellborePathBoundingBox);
            }
        }

        combinedBbox = combineNullableBBox(combinedBbox, view.combinedBoundingBox);

        // Create bounds for the layers
        const newDataBounds = createBoundsForIntersectionView(combinedBbox, intersectionReferenceSystem, dataBounds);

        if (!isValidBounds(newDataBounds)) {
            newDataBounds.x = DEFAULT_INTERSECTION_VIEW_BOUNDS.x;
            newDataBounds.y = DEFAULT_INTERSECTION_VIEW_BOUNDS.y;
        }

        // Check if bounds have changed
        if (!isEqual(newDataBounds, dataBounds)) {
            setDataBounds(newDataBounds);
        }
    }

    return dataBounds;
}

/**
 * Computes the x/y bounds that contains only the data that'd be relevant when fitting the view
 * In short, we exclude the wellbore path bounds when there is other data
 */
function useFocusBounds(
    dataIsReady: boolean,
    view: VisualizationGroup<VisualizationTarget.ESV, TargetViewReturnTypes, Record<string, any>, GroupType>,
    intersectionReferenceSystem: IntersectionReferenceSystem | null,
) {
    const [focusBounds, setFocusBounds] = React.useState<Bounds | null>(null);

    if (dataIsReady) {
        // Update focus bounds
        let focusBoundsCandidate: Bounds | null = null;

        // - Get bounds for the layers to focus on, neglect well-path and well-picks
        // - If no layers are visible: focus on well-path/reference system
        if (view.combinedBoundingBox) {
            focusBoundsCandidate = {
                x: [view.combinedBoundingBox.min.x, view.combinedBoundingBox.max.x],
                y: [view.combinedBoundingBox.min.y, view.combinedBoundingBox.max.y],
            };
        } else if (intersectionReferenceSystem) {
            // Bounds are created from the intersection reference system if no layers are visible
            focusBoundsCandidate = createBoundsForIntersectionReferenceSystem(intersectionReferenceSystem);
        }

        // Update focus bounds if they are valid, independent of the focus state
        if (
            focusBoundsCandidate &&
            isValidBounds(focusBoundsCandidate) &&
            !isEqual(focusBoundsCandidate, focusBounds)
        ) {
            setFocusBounds(focusBoundsCandidate);
        }
    }

    return focusBounds;
}

function combineNullableBBox(bbox1: BBox | null, bbox2: BBox | null): BBox | null {
    if (!bbox1) return bbox2;
    if (!bbox2) return bbox1;
    return combine(bbox1, bbox1);
}
