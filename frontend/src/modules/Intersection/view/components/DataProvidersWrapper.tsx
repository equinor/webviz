import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { IntersectionType } from "@framework/types/intersection";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { isColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { areBoundsValid, isValidViewport } from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
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
import { createBoundsForView, DEFAULT_INTERSECTION_VIEW_BOUNDS } from "../utils/boundsUtils";
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

export function DataProvidersWrapper(props: DataProvidersWrapperProps): React.ReactNode {
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [viewport, setViewport] = React.useState<Viewport>([0, 0, 2000]);
    const [bounds, setBounds] = React.useState<Bounds>(DEFAULT_INTERSECTION_VIEW_BOUNDS);
    const [prevBounds, setPrevBounds] = React.useState<Bounds | null>(null);
    const [previousIntersection, setPreviousIntersection] = React.useState<IntersectionSettingValue | null>(null);
    const [previousExtensionLength, setPreviousExtensionLength] = React.useState<number | null>(null);
    const [doUpdateViewport, setDoUpdateViewport] = React.useState(true);

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

    // Update viewport if intersection or extension length changes
    if (!isEqual(viewIntersection, previousIntersection)) {
        setDoUpdateViewport(true);
        setPreviousIntersection(viewIntersection);
    }
    if (!isEqual(extensionLength, previousExtensionLength)) {
        setDoUpdateViewport(true);
        setPreviousExtensionLength(extensionLength);
    }

    // Detect if intersection reference system has changed
    if (intersectionReferenceSystem && !isEqual(intersectionReferenceSystem, prevReferenceSystem)) {
        setDoUpdateViewport(true);
        setPrevReferenceSystem(intersectionReferenceSystem);
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

    // Create data bounds for the view, by use of bounding box for the visualization layers
    let viewBoundingBox = wellborePathBoundingBox;
    if (viewBoundingBox && assemblerProduct.combinedBoundingBox) {
        viewBoundingBox = combine(viewBoundingBox, assemblerProduct.combinedBoundingBox);
    } else if (assemblerProduct.combinedBoundingBox) {
        viewBoundingBox = assemblerProduct.combinedBoundingBox;
    }

    // Create bounds for data in the view (neglect wellbore path)
    const newBounds = createBoundsForView(
        assemblerProduct.combinedBoundingBox,
        intersectionReferenceSystem,
        prevBounds,
    );
    if (!areBoundsValid(newBounds)) {
        newBounds.x = DEFAULT_INTERSECTION_VIEW_BOUNDS.x;
        newBounds.y = DEFAULT_INTERSECTION_VIEW_BOUNDS.y;
    }

    // Check if bounds have changed
    if (!isEqual(newBounds, bounds)) {
        setPrevBounds(bounds);
        setBounds(newBounds);
    }

    // Update viewport
    const boundingBoxForViewport = assemblerProduct.combinedBoundingBox;
    if (doUpdateViewport && boundingBoxForViewport) {
        // Get bounds for the view, to create viewport for the intersection data (not wellpath and wellpicks)
        // NB: The wellpicks provider does not have a bounding box, thereby we can use the combined bounding box
        const viewportBounds: Bounds = {
            x: [boundingBoxForViewport.min.x, boundingBoxForViewport.max.x],
            y: [boundingBoxForViewport.min.y, boundingBoxForViewport.max.y],
        };

        // Create candidate viewport from bounds of data
        const viewportRatioCandidate = mainDivSize.width / mainDivSize.height;
        const viewportRatio = Number.isNaN(viewportRatioCandidate) ? 1 : viewportRatioCandidate;
        const candidateViewport: [number, number, number] = [
            viewportBounds.x[0] + (viewportBounds.x[1] - viewportBounds.x[0]) / 2,
            viewportBounds.y[0] + (viewportBounds.y[1] - viewportBounds.y[0]) / 2,
            Math.max(
                Math.abs(viewportBounds.y[1] - viewportBounds.y[0]) * viewportRatio,
                Math.abs(viewportBounds.x[1] - viewportBounds.x[0]),
            ) * 1.2,
        ];

        if (isValidViewport(candidateViewport) && !isEqual(candidateViewport, viewport)) {
            setViewport(candidateViewport);
            setDoUpdateViewport(false);
        }
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
                    bounds={bounds}
                    viewport={viewport}
                    workbenchServices={props.workbenchServices}
                    viewContext={props.viewContext}
                    wellboreHeaderUuid={wellboreUuid}
                />
                <ColorLegendsContainer colorScales={colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}
