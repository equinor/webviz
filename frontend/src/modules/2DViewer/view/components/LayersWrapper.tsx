import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import * as bbox from "@lib/utils/bbox";
import { makeColorScaleAnnotation } from "@modules/2DViewer/LayerFramework/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/2DViewer/LayerFramework/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/2DViewer/LayerFramework/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/2DViewer/LayerFramework/boundingBoxes/makeSurfaceLayerBoundingBox";
import { ObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/ObservedSurfaceLayer";
import { RealizationGridLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationPolygonsLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/StatisticalSurfaceLayer";
import { CustomLayerType } from "@modules/2DViewer/LayerFramework/customLayerImplementations/layerTypes";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeObservedSurfaceLayer";
import { makeRealizationGridLayer } from "@modules/2DViewer/LayerFramework/visualization/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/2DViewer/LayerFramework/visualization/makeRealizationPolygonsLayer";
import { makeRealizationSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeStatisticalSurfaceLayer";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import type { DataLayerManager } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellborePicksLayer";
import { LayerType } from "@modules/_shared/LayerFramework/layers/layerTypes";
import type {
    Annotation,
    LayerWithPosition,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { VisualizationFactory } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import type { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";
import "../../LayerFramework/customLayerImplementations/registerAllLayers";

export type LayersWrapperProps = {
    layerManager: DataLayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

const VISUALIZATION_FACTORY = new VisualizationFactory<VisualizationTarget.DECK_GL>();

VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.OBSERVED_SURFACE, ObservedSurfaceLayer, {
    makeVisualizationFunction: makeObservedSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_SURFACE, RealizationSurfaceLayer, {
    makeVisualizationFunction: makeRealizationSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.STATISTICAL_SURFACE, StatisticalSurfaceLayer, {
    makeVisualizationFunction: makeStatisticalSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_POLYGONS, RealizationPolygonsLayer, {
    makeVisualizationFunction: makeRealizationPolygonsLayer,
    calculateBoundingBoxFunction: makePolygonDataBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(CustomLayerType.REALIZATION_GRID, RealizationGridLayer, {
    makeVisualizationFunction: makeRealizationGridLayer,
    calculateBoundingBoxFunction: makeRealizationGridBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksLayer, {
    makeVisualizationFunction: makeDrilledWellborePicksLayer,
    calculateBoundingBoxFunction: makeDrilledWellborePicksBoundingBox,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesLayer, {
    makeVisualizationFunction: makeDrilledWellTrajectoriesLayer,
    calculateBoundingBoxFunction: makeDrilledWellTrajectoriesBoundingBox,
});

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

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

    numCols = Math.ceil(Math.sqrt(factoryProduct.views.length));
    numRows = Math.ceil(factoryProduct.views.length / numCols);

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    views.layout = [numCols, numRows];

    viewerLayers.push(...factoryProduct.layers);
    globalAnnotations.push(...factoryProduct.annotations);
    const globalLayerIds = factoryProduct.layers.map((layer) => layer.layer.id);

    for (const view of factoryProduct.views) {
        viewports.push({
            id: view.id,
            name: view.name,
            isSync: true,
            layerIds: [...globalLayerIds, ...view.layers.map((layer) => layer.layer.id), "placeholder"],
        });
        viewerLayers.push(...view.layers);

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

    numLoadingLayers = factoryProduct.numLoadingLayers;
    statusWriter.setLoading(factoryProduct.numLoadingLayers > 0);

    for (const message of factoryProduct.errorMessages) {
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
