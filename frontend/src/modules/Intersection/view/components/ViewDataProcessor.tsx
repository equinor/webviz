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
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
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
import {
    createLayerItemsForIntersectionType,
    makeViewProvidersVisualizationLayerItems,
} from "../utils/createLayerItemsUtils";

import { ViewportWrapper } from "./ViewportWrapper";

// State for request of view refocus
const enum RefocusRequestState {
    NONE = "None",
    AWAITING_PROVIDERS = "Awaiting providers",
}

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

export function ViewDataProcessor(props: ViewDataProcessorProps): React.ReactNode {
    const { view, fieldIdentifier, isLoading, wellboreHeadersQuery } = props;

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [layersBounds, setLayersBounds] = React.useState<Bounds>(DEFAULT_INTERSECTION_VIEW_BOUNDS);
    const [prevLayersBounds, setPrevLayersBounds] = React.useState<Bounds | null>(null);
    const [previousIntersection, setPreviousIntersection] = React.useState<IntersectionSettingValue | null>(null);
    const [previousExtensionLength, setPreviousExtensionLength] = React.useState<number | null>(null);
    const [prevNumberOfProviders, setPrevNumberOfProviders] = React.useState<number>(0);

    // Update of intersection/extension length should trigger refocus of viewport
    const [refocusRequestState, setRefocusRequestState] = React.useState<RefocusRequestState>(RefocusRequestState.NONE);
    const [viewportFocusTarget, setViewportFocusTarget] = React.useState<{
        bounds: Bounds | null;
        requestRefocus: boolean;
    }>({
        bounds: null,
        requestRefocus: false,
    });

    const viewIntersection = view.customProps?.intersection ?? null;
    const viewExtensionLength = view.customProps?.extensionLength ?? null;

    const wellboreUuid = viewIntersection?.type === IntersectionType.WELLBORE ? viewIntersection.uuid : null;
    const wellboreCasingsQuery = useWellboreCasingsQuery(wellboreUuid);

    // Create intersection reference system for view
    const intersectionReferenceSystem: IntersectionReferenceSystem | null = useCreateIntersectionReferenceSystem(
        viewIntersection,
        fieldIdentifier ?? null,
        props.workbenchSession,
    );

    // If layers are loading, they are not placed in children array for the view
    const numberOfProvidersToVisualize = (view.numLoadingDataProviders ?? 0) + (view.children.length ?? 0);
    if (numberOfProvidersToVisualize !== prevNumberOfProviders) {
        // Request refocus if no providers were visualized before, or if no providers are visualized now
        if (
            (numberOfProvidersToVisualize > 0 && prevNumberOfProviders === 0) ||
            (numberOfProvidersToVisualize === 0 && prevNumberOfProviders > 0)
        ) {
            setRefocusRequestState(RefocusRequestState.AWAITING_PROVIDERS);
            setViewportFocusTarget({ bounds: null, requestRefocus: false });
        }
        setPrevNumberOfProviders(numberOfProvidersToVisualize);
    }

    // Update focus bounds if intersection or extension length changes
    if (!isEqual(viewIntersection, previousIntersection)) {
        setPreviousIntersection(viewIntersection);
        setRefocusRequestState(RefocusRequestState.AWAITING_PROVIDERS);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }
    if (!isEqual(viewExtensionLength, previousExtensionLength)) {
        setPreviousExtensionLength(viewExtensionLength);
        setRefocusRequestState(RefocusRequestState.AWAITING_PROVIDERS);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }

    // Detect if intersection reference system has changed
    if (intersectionReferenceSystem && !isEqual(intersectionReferenceSystem, prevReferenceSystem)) {
        setPrevReferenceSystem(intersectionReferenceSystem);
        setRefocusRequestState(RefocusRequestState.AWAITING_PROVIDERS);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }

    const hasNoProvidersToVisualize = view && view.children.length === 0;
    const isOneOrMoreProvidersReady =
        view && view.children.length > 0 && view.numLoadingDataProviders < view.children.length;
    if (
        (hasNoProvidersToVisualize || isOneOrMoreProvidersReady) &&
        refocusRequestState === RefocusRequestState.AWAITING_PROVIDERS
    ) {
        // Set bounds to null to ensure that bounds are recalculated/updated when requesting refocus
        setViewportFocusTarget({ bounds: null, requestRefocus: true });
        setRefocusRequestState(RefocusRequestState.NONE);
    }

    // Make layer items for the view providers using intersection reference system
    const visualizationLayerItems: LayerItem[] = [];
    if (view && intersectionReferenceSystem) {
        // LayerItem elements for the view providers
        visualizationLayerItems.push(
            ...makeViewProvidersVisualizationLayerItems(view as ViewGroup, intersectionReferenceSystem),
        );
    }

    // Create elements based on intersection type
    // - LayerItems for intersection type
    // - Bounding box for wellbore path
    let wellborePathBoundingBox: BBox | null = null;
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

        // Bound box for wellbore path (uz-coordinates)
        if (viewIntersection.type === IntersectionType.WELLBORE) {
            wellborePathBoundingBox = createBBoxForWellborePath(
                intersectionReferenceSystem.projectedPath,
                viewExtensionLength ?? 0,
            );
        }
    }

    // Create data bounds for the layers, by use of bounding box for the visualization layers (per-view)
    let layersBoundingBox = wellborePathBoundingBox;
    if (layersBoundingBox && view.combinedBoundingBox) {
        layersBoundingBox = combine(layersBoundingBox, view.combinedBoundingBox);
    } else if (view.combinedBoundingBox) {
        layersBoundingBox = view.combinedBoundingBox;
    }

    // Create bounds for the layers
    const newLayersBounds = createBoundsForIntersectionView(
        layersBoundingBox,
        intersectionReferenceSystem,
        prevLayersBounds,
    );
    if (!isValidBounds(newLayersBounds)) {
        newLayersBounds.x = DEFAULT_INTERSECTION_VIEW_BOUNDS.x;
        newLayersBounds.y = DEFAULT_INTERSECTION_VIEW_BOUNDS.y;
    }

    // Check if bounds have changed
    if (!isEqual(newLayersBounds, layersBounds)) {
        setPrevLayersBounds(layersBounds);
        setLayersBounds(newLayersBounds);
    }

    // Update focus bounds
    // - Get bounds for the layers to focus on, neglect wellpath and wellpicks
    // - If no layers are visible: focus on wellpath/reference system
    let focusBoundsCandidate: Bounds | null = null;
    const focusBoundingBox = view.combinedBoundingBox;
    if (focusBoundingBox) {
        focusBoundsCandidate = {
            x: [focusBoundingBox.min.x, focusBoundingBox.max.x],
            y: [focusBoundingBox.min.y, focusBoundingBox.max.y],
        };
    } else if (!focusBoundingBox && !isLoading && intersectionReferenceSystem) {
        // Bounds are created from the intersection reference system if no layers are visible
        focusBoundsCandidate = createBoundsForIntersectionReferenceSystem(intersectionReferenceSystem);
    }

    // Update focus bounds if they are valid, independent of the focus state
    if (
        focusBoundsCandidate &&
        isValidBounds(focusBoundsCandidate) &&
        !isEqual(focusBoundsCandidate, viewportFocusTarget.bounds)
    ) {
        setViewportFocusTarget((prev) => {
            return { ...prev, bounds: focusBoundsCandidate };
        });
    }

    const handleOnViewportRefocused = React.useCallback(function handleOnViewportRefocused(): void {
        setViewportFocusTarget((prev) => {
            return {
                ...prev,
                requestRefocus: false,
            };
        });
    }, []);

    const layerIdToNameMap = Object.fromEntries(visualizationLayerItems.map((layer) => [layer.id, layer.name]));
    const colorScales = view.annotations.filter((elm) => isColorScaleWithId(elm)) ?? [];

    return (
        <ViewportWrapper
            viewId={view.id}
            name={view.name}
            color={view.color}
            referenceSystem={intersectionReferenceSystem ?? undefined}
            layerItems={visualizationLayerItems}
            layerItemIdToNameMap={layerIdToNameMap}
            layerItemsBounds={layersBounds}
            focusBounds={viewportFocusTarget.bounds}
            doRefocus={viewportFocusTarget.requestRefocus}
            colorScales={colorScales}
            workbenchServices={props.workbenchServices}
            hoverService={props.hoverService}
            viewContext={props.viewContext}
            intersectionSource={viewIntersection}
            onViewportRefocused={handleOnViewportRefocused}
        />
    );
}
