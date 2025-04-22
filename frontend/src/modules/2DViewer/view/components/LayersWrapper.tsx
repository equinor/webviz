import React from "react";

import { View as DeckGlView, type Layer } from "@deck.gl/core";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import * as bbox from "@lib/utils/bbox";
import { makeColorScaleAnnotation } from "@modules/2DViewer/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeSurfaceLayerBoundingBox";
import { CustomDataProviderType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { ObservedSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/ObservedSurfaceProvider";
import { RealizationGridProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { RealizationPolygonsProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/StatisticalSurfaceProvider";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeObservedSurfaceLayer";
import { makeRealizationGridLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationPolygonsLayer";
import { makeRealizationSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeStatisticalSurfaceLayer";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type {
    Annotation,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

export type LayersWrapperProps = {
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.OBSERVED_SURFACE,
    ObservedSurfaceProvider,
    {
        transformToVisualization: makeObservedSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SURFACE,
    RealizationSurfaceProvider,
    {
        transformToVisualization: makeRealizationSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.STATISTICAL_SURFACE,
    StatisticalSurfaceProvider,
    {
        transformToVisualization: makeStatisticalSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_POLYGONS,
    RealizationPolygonsProvider,
    {
        transformToVisualization: makeRealizationPolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_GRID,
    RealizationGridProvider,
    {
        transformToVisualization: makeRealizationGridLayer,
        transformToBoundingBox: makeRealizationGridBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELLBORE_PICKS,
    DrilledWellborePicksProvider,
    {
        transformToVisualization: makeDrilledWellborePicksLayer,
        transformToBoundingBox: makeDrilledWellborePicksBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectoriesProvider,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer,
        transformToBoundingBox: makeDrilledWellTrajectoriesBoundingBox,
    },
);

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const viewports: ViewportType[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    const globalAnnotations: Annotation[] = [];
    const globalLayerIds: string[] = ["placeholder"];

    let numLoadingLayers = 0;

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager);

    const numViews = assemblerProduct.children.filter(
        (item) => item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW,
    ).length;

    let numCols = Math.ceil(Math.sqrt(numViews));
    let numRows = Math.ceil(numViews / numCols);

    for (const item of assemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const layerIds: string[] = [];
            for (const child of item.children) {
                if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                    const layer = child.visualization;
                    layerIds.push(layer.id);
                    deckGlLayers.push(layer);
                }
            }
            viewports.push({
                id: item.id,
                name: item.name,
                isSync: true,
                layerIds,
            });

            viewportAnnotations.push(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                /* @ts-expect-error */
                <DeckGlView key={item.id} id={item.id}>
                    <ColorLegendsContainer
                        colorScales={[...item.annotations.filter((el) => "colorScale" in el), ...globalAnnotations]}
                        height={((mainDivSize.height / 3) * 2) / numCols - 20}
                        position="left"
                    />
                    <div className="font-bold text-lg flex gap-2 justify-center items-center">
                        <div className="flex gap-2 items-center bg-white/50 p-2 backdrop-blur-sm rounded-sm">
                            <div
                                className="rounded-full h-3 w-3 border border-white"
                                style={{ backgroundColor: item.color ?? undefined }}
                            />
                            <div className="">{item.name}</div>
                        </div>
                    </div>
                </DeckGlView>,
            );
        } else if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            deckGlLayers.push(item.visualization);
            globalLayerIds.push(item.visualization.id);
        }
    }

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    if (assemblerProduct.combinedBoundingBox !== null) {
        if (prevBoundingBox !== null) {
            if (!bbox.outerBoxcontainsInnerBox(prevBoundingBox, assemblerProduct.combinedBoundingBox)) {
                setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
            }
        } else {
            setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
        }
    }

    numLoadingLayers = assemblerProduct.numLoadingDataProviders;
    statusWriter.setLoading(assemblerProduct.numLoadingDataProviders > 0);

    for (const message of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox2D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.min.x, prevBoundingBox.min.y, prevBoundingBox.max.x, prevBoundingBox.max.y];
    }

    deckGlLayers.push(new PlaceholderLayer({ id: "placeholder" }));

    deckGlLayers.reverse();

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <PendingWrapper isPending={numLoadingLayers > 0}>
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ReadoutWrapper
                        views={{
                            layout: [numCols, numRows],
                            viewports: viewports.map((viewport) => ({
                                ...viewport,
                                layerIds: [...(viewport.layerIds ?? []), ...globalLayerIds],
                            })),
                            showLabel: false,
                        }}
                        viewportAnnotations={viewportAnnotations}
                        layers={deckGlLayers}
                        bounds={bounds}
                    />
                </div>
            </PendingWrapper>
        </div>
    );
}
