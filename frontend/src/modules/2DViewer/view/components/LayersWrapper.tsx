import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
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
import { VisualizationAssembler } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import type { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";
import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

export type LayersWrapperProps = {
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

const VISUALIZATION_FACTORY = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.OBSERVED_SURFACE, ObservedSurface, {
    makeVisualizationFunction: makeObservedSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_SURFACE, RealizationSurface, {
    makeVisualizationFunction: makeRealizationSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.STATISTICAL_SURFACE, StatisticalSurface, {
    makeVisualizationFunction: makeStatisticalSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_POLYGONS, RealizationPolygons, {
    makeVisualizationFunction: makeRealizationPolygonsLayer,
    calculateBoundingBoxFunction: makePolygonDataBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_GRID, RealizationGrid, {
    makeVisualizationFunction: makeRealizationGridLayer,
    calculateBoundingBoxFunction: makeRealizationGridBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicks, {
    makeVisualizationFunction: makeDrilledWellborePicksLayer,
    calculateBoundingBoxFunction: makeDrilledWellborePicksBoundingBox,
});
VISUALIZATION_FACTORY.registerLayerFunctions(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectories, {
    makeVisualizationFunction: makeDrilledWellTrajectoriesLayer,
    calculateBoundingBoxFunction: makeDrilledWellTrajectoriesBoundingBox,
});

VISUALIZATION_FACTORY.registerGroupDataCollector(GroupType.VIEW, View, () => ({}));

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const viewports: ViewportType[] = [];
    const viewerLayers: LayerWithPosition<VisualizationTarget.DECK_GL>[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    const globalAnnotations: Annotation[] = [];

    const views: ViewsType = {
        layout: [1, 1],
        viewports: viewports,
        showLabel: false,
    };

    let numCols = 0;
    let numRows = 0;

    let numLoadingLayers = 0;

    const factoryProduct = VISUALIZATION_FACTORY.make(props.layerManager);

    numCols = Math.ceil(Math.sqrt(factoryProduct.groups.length));
    numRows = Math.ceil(factoryProduct.groups.length / numCols);

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    views.layout = [numCols, numRows];

    viewerLayers.push(...factoryProduct.dataLayers);
    globalAnnotations.push(...factoryProduct.annotations);
    const globalLayerIds = factoryProduct.dataLayers.map((layer) => layer.layer.id);

    for (const view of factoryProduct.groups) {
        viewports.push({
            id: view.id,
            name: view.name,
            isSync: true,
            layerIds: [...globalLayerIds, ...view.children.map((layer) => layer.layer.id), "placeholder"],
        });
        viewerLayers.push(...view.children);

        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={view.id} id={view.id}>
                <ColorLegendsContainer
                    colorScales={[...view.annotations.filter((el) => "colorScale" in el), ...globalAnnotations]}
                    height={((mainDivSize.height / 3) * 2) / numCols - 20}
                    position="left"
                />
                <div className="font-bold text-lg flex gap-2 justify-center items-center">
                    <div className="flex gap-2 items-center bg-white/50 p-2 backdrop-blur-sm rounded-sm">
                        <div
                            className="rounded-full h-3 w-3 border border-white"
                            style={{ backgroundColor: view.color ?? undefined }}
                        />
                        <div className="">{view.name}</div>
                    </div>
                </div>
            </DeckGlView>,
        );
    }

    if (factoryProduct.combinedBoundingBox !== null) {
        if (prevBoundingBox !== null) {
            if (!bbox.outerBoxcontainsInnerBox(prevBoundingBox, factoryProduct.combinedBoundingBox)) {
                setPrevBoundingBox(factoryProduct.combinedBoundingBox);
            }
        } else {
            setPrevBoundingBox(factoryProduct.combinedBoundingBox);
        }
    }

    numLoadingLayers = factoryProduct.numLoadingDataLayers;
    statusWriter.setLoading(factoryProduct.numLoadingDataLayers > 0);

    for (const message of factoryProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox2D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.min.x, prevBoundingBox.min.y, prevBoundingBox.max.x, prevBoundingBox.max.y];
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);
    layers.push(new PlaceholderLayer({ id: "placeholder" }));

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <PendingWrapper isPending={numLoadingLayers > 0}>
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ReadoutWrapper
                        views={views}
                        viewportAnnotations={viewportAnnotations}
                        layers={layers}
                        bounds={bounds}
                    />
                </div>
            </PendingWrapper>
        </div>
    );
}
