import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import * as bbox from "@lib/utils/boundingBox";
import { makeColorScaleAnnotation } from "@modules/2DViewer/LayerFramework/annotations/makeColorScaleAnnotation";
import { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { RealizationSeismicCrosslineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicCrosslineLayer";
import { RealizationSeismicDepthSliceLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicDepthLayer";
import { RealizationSeismicInlineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicInlineLayer";
import { makeRealizationSurfaceLayer } from "@modules/3DViewerNew/LayerFramework/visualization/makeRealizationSurfaceLayer";
import {
    Plane,
    makeSeismicFenceMeshLayerFunction,
} from "@modules/3DViewerNew/LayerFramework/visualization/makeSeismicFenceMeshLayer";
import {
    type DataLayerManager,
    LayerManagerTopic,
} from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellborePicksLayer";
import { ObservedSurfaceLayer } from "@modules/_shared/LayerFramework/layers/implementations/ObservedSurfaceLayer";
import { RealizationGridLayer } from "@modules/_shared/LayerFramework/layers/implementations/RealizationGridLayer";
import { RealizationPolygonsLayer } from "@modules/_shared/LayerFramework/layers/implementations/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "@modules/_shared/LayerFramework/layers/implementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "@modules/_shared/LayerFramework/layers/implementations/StatisticalSurfaceLayer";
import { LayerType } from "@modules/_shared/LayerFramework/layers/layerTypes";
import {
    type Annotation,
    LayerWithPosition,
    VisualizationFactory,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makePolygonDataBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makeObservedSurfaceLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeObservedSurfaceLayer";
import { makeRealizationGridLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeRealizationPolygonsLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { BoundingBox3D, ViewportType } from "@webviz/subsurface-viewer";
import { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { InteractionWrapper } from "./InteractionWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

const VISUALIZATION_FACTORY = new VisualizationFactory<VisualizationTarget.DECK_GL>();

VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.OBSERVED_SURFACE, ObservedSurfaceLayer, {
    makeVisualizationFunction: makeObservedSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.REALIZATION_SURFACE, RealizationSurfaceLayer, {
    makeVisualizationFunction: makeRealizationSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.STATISTICAL_SURFACE, StatisticalSurfaceLayer, {
    makeVisualizationFunction: makeStatisticalSurfaceLayer,
    calculateBoundingBoxFunction: makeSurfaceLayerBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.REALIZATION_POLYGONS, RealizationPolygonsLayer, {
    makeVisualizationFunction: makeRealizationPolygonsLayer,
    calculateBoundingBoxFunction: makePolygonDataBoundingBox,
    makeAnnotationsFunction: makeColorScaleAnnotation,
});
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.REALIZATION_GRID, RealizationGridLayer, {
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
VISUALIZATION_FACTORY.registerLayerFunctions(
    LayerType.REALIZATION_SEISMIC_DEPTH_SLICE,
    RealizationSeismicDepthSliceLayer,
    {
        makeVisualizationFunction: makeSeismicFenceMeshLayerFunction(Plane.DEPTH),
    },
);
VISUALIZATION_FACTORY.registerLayerFunctions(LayerType.REALIZATION_SEISMIC_INLINE, RealizationSeismicInlineLayer, {
    makeVisualizationFunction: makeSeismicFenceMeshLayerFunction(Plane.INLINE),
});
VISUALIZATION_FACTORY.registerLayerFunctions(
    LayerType.REALIZATION_SEISMIC_CROSSLINE,
    RealizationSeismicCrosslineLayer,
    {
        makeVisualizationFunction: makeSeismicFenceMeshLayerFunction(Plane.CROSSLINE),
    },
);

export type LayersWrapperProps = {
    layerManager: DataLayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

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
            show3D: true,
            layerIds: [
                ...globalLayerIds,
                ...view.layers.map((layer) => layer.layer.id),
                "placeholder",
                "axes-layer",
                "editable-polylines-layer",
                "polylines-layer",
                "hover-point-layer",
            ],
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

    statusWriter.setLoading(factoryProduct.numLoadingLayers > 0);

    for (const message of factoryProduct.errorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox3D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = bbox.toNumArray(prevBoundingBox);
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);
    layers.push(new PlaceholderLayer({ id: "placeholder" }));
    layers.push(new AxesLayer({ id: "axes-layer", visible: true, ZIncreasingDownwards: true, bounds }));

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <InteractionWrapper
                    views={views}
                    viewportAnnotations={viewportAnnotations}
                    layers={layers}
                    bounds={bounds}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            </div>
        </div>
    );
}
