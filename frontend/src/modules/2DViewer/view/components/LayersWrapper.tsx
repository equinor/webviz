import React from "react";

import { View as DeckGlView, type Layer } from "@deck.gl/core";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import * as bbox from "@lib/utils/bbox";
import { makeColorScaleAnnotation } from "@modules/2DViewer/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeSurfaceLayerBoundingBox";
import { ObservedSurface } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/ObservedSurface";
import { RealizationGrid } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGrid";
import { RealizationPolygons } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationPolygons";
import { RealizationSurface } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurface";
import { StatisticalSurface } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/StatisticalSurface";
import { CustomLayerType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/layerTypes";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeObservedSurfaceLayer";
import { makeRealizationGridLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationPolygonsLayer";
import { makeRealizationSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeStatisticalSurfaceLayer";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellTrajectories } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectories";
import { DrilledWellborePicks } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicks";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { View } from "@modules/_shared/DataProviderFramework/groups/implementations/View";
import type {
    Annotation,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";
import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

export type LayersWrapperProps = {
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<
    VisualizationTarget.DECK_GL,
    {
        [GroupType.VIEW]: {
            test: string;
        };
    }
>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(CustomLayerType.OBSERVED_SURFACE, ObservedSurface, {
    transformToVisualization: makeObservedSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(CustomLayerType.REALIZATION_SURFACE, RealizationSurface, {
    transformToVisualization: makeRealizationSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(CustomLayerType.STATISTICAL_SURFACE, StatisticalSurface, {
    transformToVisualization: makeStatisticalSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(CustomLayerType.REALIZATION_POLYGONS, RealizationPolygons, {
    transformToVisualization: makeRealizationPolygonsLayer,
    transformToBoundingBox: makePolygonDataBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(CustomLayerType.REALIZATION_GRID, RealizationGrid, {
    transformToVisualization: makeRealizationGridLayer,
    transformToBoundingBox: makeRealizationGridBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELLBORE_PICKS,
    DrilledWellborePicks,
    {
        transformToVisualization: makeDrilledWellborePicksLayer,
        transformToBoundingBox: makeDrilledWellborePicksBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectories,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer,
        transformToBoundingBox: makeDrilledWellTrajectoriesBoundingBox,
    },
);

VISUALIZATION_ASSEMBLER.registerGroupCustomPropsCollector(GroupType.VIEW, View, ({ name }) => ({ test: name }));

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

    let numCols = 0;
    let numRows = 0;

    let numLoadingLayers = 0;

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager);

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

    numCols = Math.ceil(Math.sqrt(viewports.length));
    numRows = Math.ceil(viewports.length / numCols);

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
