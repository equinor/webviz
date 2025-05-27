import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { IntersectionType } from "@framework/types/intersection";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { isColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { areBoundsValid } from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { IntersectionRealizationSeismicProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { type DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { IntersectionView } from "@modules/_shared/DataProviderFramework/groups/implementations/IntersectionView";
import { useVisualizationAssemblerProduct } from "@modules/_shared/DataProviderFramework/hooks/useVisualizationProduct";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { useDrilledWellboreHeadersQuery } from "@modules/_shared/WellBore";
import {
    makeGridColorScaleAnnotation,
    makeSeismicColorScaleAnnotation,
} from "@modules/Intersection/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makeGridBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeGridBoundingBox";
import { makeSeismicBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSeismicBoundingBox";
import { makeSurfacesBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSurfacesBoundingBox";
import { makeSurfacesUncertaintiesBoundingBox } from "@modules/Intersection/DataProviderFramework/boundingBoxes/makeSurfacesUncertaintiesBoundingBox";
import { CustomDataProviderType } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { EnsembleWellborePicksProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/EnsembleWellborePicksProvider";
import { RealizationSurfacesProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/RealizationSurfacesProvider";
import { SurfacesPerRealizationValuesProvider } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/SurfacesPerRealizationValuesProvider";
import type { IntersectionInjectedData } from "@modules/Intersection/DataProviderFramework/injectedDataType";
import { createGridLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createGridLayerItemsMaker";
import { createSeismicLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSeismicLayerItemsMaker";
import { createSurfacesLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSurfacesLayerItemsMaker";
import { createSurfacesUncertaintiesLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createSurfacesUncertaintiesLayerItemsMaker";
import { createWellborePicksLayerItemsMaker } from "@modules/Intersection/DataProviderFramework/visualization/createWellborePicksLayerItemsMaker";
import { makeEsvViewDataCollection } from "@modules/Intersection/DataProviderFramework/visualization/makeEsvViewDataCollection";
import type { Interfaces } from "@modules/Intersection/interfaces";
import type { PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
import { useWellboreCasingsQuery } from "../hooks/queryHooks";
import { useCreateIntersectionReferenceSystem } from "../hooks/useIntersectionReferenceSystem";
import { createBBoxForWellborePath } from "../utils/boundingBoxUtils";
import { createBoundsForIntersectionView, DEFAULT_INTERSECTION_VIEW_BOUNDS } from "../utils/boundsUtils";
import {
    createLayerItemsForIntersectionType,
    makeViewProvidersVisualizationLayerItems,
} from "../utils/createLayerItemsUtils";

import { ViewportWrapper } from "./ViewportWrapper";

export type DataProvidersWrapperProps = {
    dataProviderManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    workbenchServices: WorkbenchServices;
};

export type EsvView = {
    intersection: IntersectionSettingValue | null;
    extensionLength: number | null;
};

export type TargetViewReturnTypes = {
    [GroupType.VIEW]: Record<string, never>; // No data needed for the view?
    [GroupType.INTERSECTION_VIEW]: EsvView;
};

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<
    VisualizationTarget.ESV,
    TargetViewReturnTypes,
    IntersectionInjectedData
>();

VISUALIZATION_ASSEMBLER.registerGroupCustomPropsCollector(
    GroupType.INTERSECTION_VIEW,
    IntersectionView,
    makeEsvViewDataCollection,
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: createGridLayerItemsMaker,
        transformToBoundingBox: makeGridBoundingBox,
        transformToAnnotations: makeGridColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: createSeismicLayerItemsMaker,
        transformToBoundingBox: makeSeismicBoundingBox,
        transformToAnnotations: makeSeismicColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: createSeismicLayerItemsMaker,
        transformToBoundingBox: makeSeismicBoundingBox,
        transformToAnnotations: makeSeismicColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.ENSEMBLE_WELLBORE_PICKS,
    EnsembleWellborePicksProvider,
    {
        transformToVisualization: createWellborePicksLayerItemsMaker,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SURFACES,
    RealizationSurfacesProvider,
    {
        transformToVisualization: createSurfacesLayerItemsMaker,
        transformToBoundingBox: makeSurfacesBoundingBox,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.SURFACES_REALIZATIONS_UNCERTAINTY,
    SurfacesPerRealizationValuesProvider,
    {
        transformToVisualization: createSurfacesUncertaintiesLayerItemsMaker,
        transformToBoundingBox: makeSurfacesUncertaintiesBoundingBox,
    },
);

// State for request of view refocus
const enum RefocusRequestState {
    NONE = "None",
    AWAITING_LOADING_DATA = "Await data loading",
}

export function DataProvidersWrapper(props: DataProvidersWrapperProps): React.ReactNode {
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [layersBounds, setLayersBounds] = React.useState<Bounds>(DEFAULT_INTERSECTION_VIEW_BOUNDS);
    const [prevLayersBounds, setPrevLayersBounds] = React.useState<Bounds | null>(null);
    const [previousIntersection, setPreviousIntersection] = React.useState<IntersectionSettingValue | null>(null);
    const [previousExtensionLength, setPreviousExtensionLength] = React.useState<number | null>(null);

    // Update of intersection/extension length should trigger refocus of viewport
    const [refocusRequestState, setRefocusRequestState] = React.useState<RefocusRequestState>(RefocusRequestState.NONE);
    const [viewportFocusTarget, setViewportFocusTarget] = React.useState<{
        bounds: Bounds | null;
        requestRefocus: boolean;
    }>({
        bounds: null,
        requestRefocus: false,
    });

    const fieldIdentifier = props.dataProviderManager.getGlobalSetting("fieldId");

    // Assemble visualization of providers
    const assemblerProduct = useVisualizationAssemblerProduct(props.dataProviderManager, VISUALIZATION_ASSEMBLER);
    if (assemblerProduct.children.length === 0) {
        statusWriter.addWarning("Create intersection view to visualize");
    }
    if (assemblerProduct.children.length > 1) {
        throw new Error("Multiple views are not supported");
    }

    // Retrieve error messages from assembler
    for (const error of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(error);
    }

    // Set loading status
    const isLoading = assemblerProduct.numLoadingDataProviders > 0;
    statusWriter.setLoading(isLoading);

    // View of interest when supporting only one view
    const viewCandidate = assemblerProduct.children.find((child) => child.itemType === VisualizationItemType.GROUP);
    const view = viewCandidate ?? null;

    const viewIntersection = view?.customProps.intersection ?? null;
    const extensionLength = view?.customProps.extensionLength ?? null;

    // Additional visualization for wellbore
    const wellboreHeadersQuery = useDrilledWellboreHeadersQuery(fieldIdentifier ?? undefined);
    const wellboreUuid = viewIntersection?.type === IntersectionType.WELLBORE ? viewIntersection.uuid : null;
    const wellboreCasingsQuery = useWellboreCasingsQuery(wellboreUuid);

    // Create intersection reference system for view
    const intersectionReferenceSystem: IntersectionReferenceSystem | null = useCreateIntersectionReferenceSystem(
        viewIntersection,
        fieldIdentifier ?? null,
        props.workbenchSession,
    );

    // Update focus bounds if intersection or extension length changes
    if (!isEqual(viewIntersection, previousIntersection)) {
        setPreviousIntersection(viewIntersection);
        setRefocusRequestState(RefocusRequestState.AWAITING_LOADING_DATA);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }
    if (!isEqual(extensionLength, previousExtensionLength)) {
        setPreviousExtensionLength(extensionLength);
        setRefocusRequestState(RefocusRequestState.AWAITING_LOADING_DATA);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }

    // Detect if intersection reference system has changed
    if (intersectionReferenceSystem && !isEqual(intersectionReferenceSystem, prevReferenceSystem)) {
        setPrevReferenceSystem(intersectionReferenceSystem);
        setRefocusRequestState(RefocusRequestState.AWAITING_LOADING_DATA);
        setViewportFocusTarget({ bounds: null, requestRefocus: false });
    }

    const isOneOrMoreProvidersReady =
        viewCandidate &&
        viewCandidate.children.length > 0 &&
        viewCandidate.numLoadingDataProviders < viewCandidate.children.length;
    if (isOneOrMoreProvidersReady && refocusRequestState === RefocusRequestState.AWAITING_LOADING_DATA) {
        // Set bounds to null to ensure that bounds are recalculated/updated when requesting refocus
        setViewportFocusTarget({ bounds: null, requestRefocus: true });
        setRefocusRequestState(RefocusRequestState.NONE);
    }

    // Make layer items for the view providers using intersection reference system
    const visualizationLayerItems: LayerItem[] = [];
    if (view && intersectionReferenceSystem) {
        // LayerItem elements for the view providers
        visualizationLayerItems.push(...makeViewProvidersVisualizationLayerItems(view, intersectionReferenceSystem));
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
                extensionLength ?? 0,
            );
        }
    }

    // Create data bounds for the layers, by use of bounding box for the visualization layers
    let layersBoundingBox = wellborePathBoundingBox;
    if (layersBoundingBox && assemblerProduct.combinedBoundingBox) {
        layersBoundingBox = combine(layersBoundingBox, assemblerProduct.combinedBoundingBox);
    } else if (assemblerProduct.combinedBoundingBox) {
        layersBoundingBox = assemblerProduct.combinedBoundingBox;
    }

    // Create bounds for the layers
    const newLayersBounds = createBoundsForIntersectionView(
        layersBoundingBox,
        intersectionReferenceSystem,
        prevLayersBounds,
    );
    if (!areBoundsValid(newLayersBounds)) {
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
    // - Wellpicks provider does not have a bounding box, thereby we can use the combined bounding box
    const focusBoundingBox = assemblerProduct.combinedBoundingBox;
    if (focusBoundingBox) {
        const focusBoundsCandidate: Bounds = {
            x: [focusBoundingBox.min.x, focusBoundingBox.max.x],
            y: [focusBoundingBox.min.y, focusBoundingBox.max.y],
        };

        // Update focus bounds if they are valid, independent of the focus state
        if (areBoundsValid(focusBoundsCandidate) && !isEqual(focusBoundsCandidate, viewportFocusTarget.bounds)) {
            setViewportFocusTarget((prev) => {
                return { ...prev, bounds: focusBoundsCandidate };
            });
        }
    }

    function handleOnViewportRefocused(): void {
        setViewportFocusTarget((prev) => {
            return {
                ...prev,
                requestRefocus: false,
            };
        });
    }

    const layerIdToNameMap = Object.fromEntries(visualizationLayerItems.map((layer) => [layer.id, layer.name]));
    const colorScales = view?.annotations.filter((elm) => isColorScaleWithId(elm)) ?? [];

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <ViewportWrapper
                    referenceSystem={intersectionReferenceSystem ?? undefined}
                    layerItems={visualizationLayerItems}
                    layerItemIdToNameMap={layerIdToNameMap}
                    layerItemsBounds={layersBounds}
                    focusBounds={viewportFocusTarget.bounds}
                    doRefocus={viewportFocusTarget.requestRefocus}
                    workbenchServices={props.workbenchServices}
                    viewContext={props.viewContext}
                    wellboreHeaderUuid={wellboreUuid}
                    onViewportRefocused={handleOnViewportRefocused}
                />
                <ColorLegendsContainer colorScales={colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}
