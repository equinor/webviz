import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

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
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { IntersectionRealizationSeismicProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { makeColorScaleAnnotation } from "@modules/IntersectionNew/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makeGridBoundingBox } from "@modules/IntersectionNew/DataProviderFramework/boundingBoxes/makeGridBoundingBox";
import { makeSeismicBoundingBox } from "@modules/IntersectionNew/DataProviderFramework/boundingBoxes/makeSeismicBoundingBox";
import { makeSurfacesBoundingBox } from "@modules/IntersectionNew/DataProviderFramework/boundingBoxes/makeSurfacesBoundingBox";
import { CustomDataProviderType } from "@modules/IntersectionNew/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { EnsembleWellborePicksProvider } from "@modules/IntersectionNew/DataProviderFramework/customDataProviderImplementations/EnsembleWellborePicksProvider";
import { RealizationSurfacesProvider } from "@modules/IntersectionNew/DataProviderFramework/customDataProviderImplementations/RealizationSurfacesProvider";
import { SurfacesPerRealizationValuesProvider } from "@modules/IntersectionNew/DataProviderFramework/customDataProviderImplementations/SurfacesPerRealizationValuesProvider";
import type { IntersectionInjectedData } from "@modules/IntersectionNew/DataProviderFramework/injectedDataType";
import { createGridLayerItemsMaker } from "@modules/IntersectionNew/DataProviderFramework/visualization/createGridLayerItemsMaker";
import { createSeismicLayerItemsMaker } from "@modules/IntersectionNew/DataProviderFramework/visualization/createSeismicLayerItemsMaker";
import { createSurfacesLayerItemsMaker } from "@modules/IntersectionNew/DataProviderFramework/visualization/createSurfacesLayerItemsMaker";
import { createUncertaintySurfacesLayerItemsMaker } from "@modules/IntersectionNew/DataProviderFramework/visualization/createUncertaintySurfacesLayerItemsMaker";
import { createWellborePicksLayerItemsMaker } from "@modules/IntersectionNew/DataProviderFramework/visualization/createWellborePicksLayerItemsMaker";
import { makeEsvViewDataCollection } from "@modules/IntersectionNew/DataProviderFramework/visualization/makeEsvViewDataCollection";
import type { Interfaces } from "@modules/IntersectionNew/interfaces";
import type { PreferredViewLayout } from "@modules/IntersectionNew/typesAndEnums";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { IntersectionView } from "@modules/_shared/DataProviderFramework/groups/implementations/IntersectionView";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type {
    EsvLayerItemsMaker,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { useDrilledWellboreHeadersQuery } from "@modules/_shared/WellBore";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { isColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { LayerItem } from "@modules/_shared/components/EsvIntersection";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isEqual } from "lodash";

import { ViewportWrapper } from "./viewportWrapper";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
import { useWellboreCasingsQuery } from "../hooks/queryHooks";
import { useCreateIntersectionReferenceSystem } from "../hooks/useIntersectionReferenceSystem";
import { createReferenceLinesLayerItem } from "../utils/createReferenceLines";
import { createWellboreLayerItems } from "../utils/createWellboreLayerItems";

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
    DataProviderType.INTERSECTION_WITH_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: createGridLayerItemsMaker,
        transformToBoundingBox: makeGridBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: createSeismicLayerItemsMaker,
        transformToBoundingBox: makeSeismicBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: createSeismicLayerItemsMaker,
        transformToBoundingBox: makeSeismicBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
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
        transformToVisualization: createUncertaintySurfacesLayerItemsMaker,
        // transformToBoundingBox: makeSurfacesBoundingBox,
    },
);

export function DataProvidersWrapper(props: DataProvidersWrapperProps): React.ReactNode {
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    // const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [viewport, setViewport] = React.useState<Viewport>([0, 0, 2000]);
    const [prevProvidersViewport, setPrevProvidersViewport] = React.useState<Viewport | null>(null);
    const [prevBounds, setPrevBounds] = React.useState<{ x: [number, number]; y: [number, number] } | null>(null);
    const [isInitialProviderViewportSet, setIsInitialProviderViewportSet] = React.useState<boolean>(false);

    // How to detect new "order" of providers in settings/tree?
    usePublishSubscribeTopicValue(props.dataProviderManager, DataProviderManagerTopic.DATA_REVISION);

    const fieldIdentifier: string | null = props.dataProviderManager.getGlobalSetting("fieldId");

    // Assemble visualization of providers
    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.dataProviderManager);

    // Create reference system for each view:
    if (assemblerProduct.children.length === 0) {
        // return null;
        statusWriter.addWarning("Create intersection view to visualize");
    }

    if (assemblerProduct.children.length > 1) {
        // throw new Error("Multiple views are not supported");
        statusWriter.addWarning("Multiple views are not supported");
    }

    assemblerProduct.aggregatedErrorMessages.forEach((error) => {
        statusWriter.addError(error);
    });

    // View of interest when supporting only one view
    const viewCandidate = assemblerProduct.children.find((child) => child.itemType === VisualizationItemType.GROUP);
    const view = viewCandidate ?? null;

    const viewIntersection = view?.customProps.intersection ?? null;
    const extensionLength = view?.customProps.extensionLength ?? null;

    // Additional visualization for wellbore
    const wellboreHeadersQuery = useDrilledWellboreHeadersQuery(fieldIdentifier ?? undefined);
    const wellboreUuid = viewIntersection?.type === IntersectionType.WELLBORE ? viewIntersection.uuid : null;
    const wellboreCasings = useWellboreCasingsQuery(wellboreUuid);

    // Create intersection reference system for view
    const intersectionReferenceSystem: IntersectionReferenceSystem | null = useCreateIntersectionReferenceSystem(
        viewIntersection,
        fieldIdentifier,
        props.workbenchSession,
    );

    // Detect if intersection reference system has changed
    // let hasNewIntersectionReferenceSystem = false;
    // if (intersectionReferenceSystem && !isEqual(intersectionReferenceSystem, prevReferenceSystem)) {
    //     hasNewIntersectionReferenceSystem = true;
    //     setPrevReferenceSystem(intersectionReferenceSystem);
    //     setIsInitialLayerViewportSet(false);
    //     setPrevLayersViewport(null);
    // }

    // Extract esv layers from view of interest
    const providerVisualizationMakers: EsvLayerItemsMaker[] = [];

    // Make layers using intersection reference system
    const assemblerLayerItems: LayerItem[] = [];

    // Layers to be visualized in esv intersection
    const visualizationLayerItems: LayerItem[] = [];

    let boundingBox: BBox | null = null;
    if (view && viewIntersection && intersectionReferenceSystem) {
        for (const item of view.children) {
            if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                providerVisualizationMakers.push(item.visualization);
            }
        }

        providerVisualizationMakers.push(
            ...[...view.children]
                .filter((elm) => elm.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION)
                .map((child) => child.visualization)
                .flat(),
        );

        // Make LayerItems for each visualization
        const perProviderLayerItems: LayerItem[][] = [];
        for (const visualizationMaker of providerVisualizationMakers) {
            perProviderLayerItems.push(visualizationMaker.makeLayerItems(intersectionReferenceSystem));
        }

        // Assign esv LayerItem order, reverse
        const numProviders = perProviderLayerItems.length;
        for (const [index, providerLayerItems] of perProviderLayerItems.entries()) {
            const layerItemOrder = numProviders - index;
            for (const providerItem of providerLayerItems) {
                if (providerItem.options) {
                    providerItem.options.order = layerItemOrder;
                }
            }
        }

        // Add ordered layers to assembler layers
        assemblerLayerItems.push(...perProviderLayerItems.flat());

        if (viewIntersection.type === IntersectionType.CUSTOM_POLYLINE) {
            visualizationLayerItems.push(createReferenceLinesLayerItem());
        }

        if (viewIntersection.type === IntersectionType.WELLBORE) {
            if (wellboreHeadersQuery.data && wellboreHeadersQuery.data.length > 0) {
                visualizationLayerItems.push(
                    createReferenceLinesLayerItem({
                        depthReferenceElevation: wellboreHeadersQuery.data[0].depthReferenceElevation,
                        depthReferencePoint: wellboreHeadersQuery.data[0].depthReferencePoint,
                    }),
                );
            }

            const layerOrder = providerVisualizationMakers.length * 2 + 1; // Place layers on top of factory layers
            const wellboreCasingsData =
                wellboreCasings.data && wellboreCasings.data.length > 0 ? wellboreCasings.data : null;
            visualizationLayerItems.push(
                ...createWellboreLayerItems(wellboreCasingsData, intersectionReferenceSystem, layerOrder),
            );

            // Bound box for wellbore path
            const validExtensionLength = extensionLength ?? 0;
            const wellborePath = intersectionReferenceSystem.projectedPath;
            const minX = Math.min(...wellborePath.map((point) => point[0]));
            const maxX = Math.max(...wellborePath.map((point) => point[0]));
            const minY = Math.min(...wellborePath.map((point) => point[1]));
            const maxY = Math.max(...wellborePath.map((point) => point[1]));

            boundingBox = {
                min: {
                    x: minX - validExtensionLength,
                    y: minY,
                    z: 0.0,
                },
                max: {
                    x: maxX + validExtensionLength,
                    y: maxY,
                    z: 0.0,
                },
            } as BBox;
        }
    }

    // Append the assembler layers to the visualization layers
    visualizationLayerItems.push(...assemblerLayerItems);

    const layerIdToNameMap = Object.fromEntries(visualizationLayerItems.map((layer) => [layer.id, layer.name]));

    const isLoading = assemblerProduct.numLoadingDataProviders > 0;
    statusWriter.setLoading(isLoading);

    let combinedBoundingBox: BBox | null = null;
    if (boundingBox && assemblerProduct.combinedBoundingBox) {
        combinedBoundingBox = combine(boundingBox, assemblerProduct.combinedBoundingBox);
    } else if (boundingBox) {
        combinedBoundingBox = boundingBox;
    } else if (assemblerProduct.combinedBoundingBox) {
        combinedBoundingBox = assemblerProduct.combinedBoundingBox;
    }

    const bounds: { x: [number, number]; y: [number, number] } = {
        x: [Number.MAX_VALUE, Number.MIN_VALUE],
        y: [Number.MAX_VALUE, Number.MIN_VALUE],
    };
    let isBoundsSetByProvider = false;
    if (combinedBoundingBox) {
        bounds.x = [combinedBoundingBox.min.x, combinedBoundingBox.max.x];
        bounds.y = [combinedBoundingBox.min.y, combinedBoundingBox.max.y];
        isBoundsSetByProvider = true;
    }

    // Create viewport from intersectionReferenceSystem (i.e. the polyline)
    // - The intersection uz-coordinate system correspond to the esv intersection internal xy-coordinate system
    // if (intersectionReferenceSystem && hasNewIntersectionReferenceSystem) {
    if (!isBoundsSetByProvider && intersectionReferenceSystem) {
        const firstPoint = intersectionReferenceSystem.projectedPath[0];
        const numPoints = intersectionReferenceSystem.projectedPath.length;
        const lastPoint = intersectionReferenceSystem.projectedPath[numPoints - 1];
        const uMax = Math.max(firstPoint[0], lastPoint[0], 1000);
        const uMin = Math.min(firstPoint[0], lastPoint[0], -1000);
        const zMax = Math.max(firstPoint[1], lastPoint[1]);
        const zMin = Math.min(firstPoint[1], lastPoint[1]);

        // Set the (x,y)-bounds of esv intersection with uz-coordinates
        bounds.x = [uMin, uMax];
        bounds.y = [zMin, zMax];
    } else if (!isBoundsSetByProvider) {
        bounds.x = prevBounds?.x ?? [0, 2000];
        bounds.y = prevBounds?.y ?? [0, 2000];
    }

    if (!isEqual(bounds, prevBounds)) {
        setPrevBounds(bounds);
    }

    const viewportRatio = mainDivSize.width / mainDivSize.height;
    const safeViewportRatio = Number.isNaN(viewportRatio) ? 1 : viewportRatio;
    const newViewport: [number, number, number] = [
        bounds.x[0] + (bounds.x[1] - bounds.x[0]) / 2,
        bounds.y[0] + (bounds.y[1] - bounds.y[0]) / 2,
        Math.max(Math.abs(bounds.y[1] - bounds.y[0]) * safeViewportRatio, Math.abs(bounds.x[1] - bounds.x[0])) * 1.2,
    ];

    if (!isEqual(newViewport, prevProvidersViewport) && !isInitialProviderViewportSet) {
        setViewport(newViewport);
        setPrevProvidersViewport(newViewport);
        if (isBoundsSetByProvider) {
            setIsInitialProviderViewportSet(true);
        }
    }

    const isInvalidView = !view || !intersectionReferenceSystem || visualizationLayerItems.length === 0;

    const colorScales = assemblerProduct.annotations.filter((elm) => isColorScaleWithId(elm));

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            {isInvalidView ? null : (
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ViewportWrapper
                        referenceSystem={intersectionReferenceSystem ?? undefined}
                        layerItems={visualizationLayerItems}
                        layerItemIdToNameMap={layerIdToNameMap}
                        bounds={bounds}
                        viewport={viewport}
                        workbenchServices={props.workbenchServices}
                        viewContext={props.viewContext}
                        wellboreHeaderUuid={wellboreHeadersQuery.data?.[0].wellboreUuid ?? null}
                    />
                    <ColorLegendsContainer colorScales={colorScales} height={mainDivSize.height / 2 - 50} />
                </div>
            )}
        </div>
    );
}
