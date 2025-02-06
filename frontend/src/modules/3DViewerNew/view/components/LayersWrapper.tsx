import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect3D, outerRectContainsInnerRect } from "@lib/utils/geometry";
import { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { IntersectionRealizationGridLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/IntersectionRealizationGridLayer";
import { RealizationGridLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationSeismicCrosslineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicCrosslineLayer";
import { RealizationSeismicDepthSliceLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicDepthSliceLayer";
import { RealizationSeismicInlineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicInlineLayer";
import { makeGrid3DLayer } from "@modules/3DViewerNew/LayerFramework/visualization/makeGrid3dLayer";
import { makeIntersectionLayer } from "@modules/3DViewerNew/LayerFramework/visualization/makeIntersectionGrid3dLayer";
import {
    Plane,
    makeSeismicFenceMeshLayerFunction,
} from "@modules/3DViewerNew/LayerFramework/visualization/makeSeismicFenceMeshLayer";
import { LayerManager, LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { BoundingBox } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellborePicksLayer";
import {
    LayerWithPosition,
    VisualizationFactory,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeWellborePicksLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/wellborePicksLayer";
import { makeWellsLayer } from "@modules/_shared/LayerFramework/visualization/deckgl/wellsLayer";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { BoundingBox3D, ViewportType } from "@webviz/subsurface-viewer";
import { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

const VISUALIZATION_FACTORY = new VisualizationFactory<VisualizationTarget.DECK_GL>();
VISUALIZATION_FACTORY.registerVisualizationFunction(DrilledWellborePicksLayer, makeWellborePicksLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(DrilledWellTrajectoriesLayer, makeWellsLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(RealizationGridLayer, makeGrid3DLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(IntersectionRealizationGridLayer, makeIntersectionLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(
    RealizationSeismicCrosslineLayer,
    makeSeismicFenceMeshLayerFunction(Plane.CROSSLINE)
);
VISUALIZATION_FACTORY.registerVisualizationFunction(
    RealizationSeismicInlineLayer,
    makeSeismicFenceMeshLayerFunction(Plane.INLINE)
);
VISUALIZATION_FACTORY.registerVisualizationFunction(
    RealizationSeismicDepthSliceLayer,
    makeSeismicFenceMeshLayerFunction(Plane.DEPTH)
);

export type LayersWrapperProps = {
    layerManager: LayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

    const viewports: ViewportType[] = [];
    const viewerLayers: LayerWithPosition<VisualizationTarget.DECK_GL>[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    const globalColorScales: ColorScaleWithId[] = [];

    const views: ViewsType = {
        layout: [1, 1],
        viewports: viewports,
        showLabel: false,
    };

    let numCols = 0;
    let numRows = 0;

    let numLoadingLayers = 0;

    const viewsAndLayers = VISUALIZATION_FACTORY.make(props.layerManager);

    numCols = Math.ceil(Math.sqrt(viewsAndLayers.views.length));
    numRows = Math.ceil(viewsAndLayers.views.length / numCols);

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    views.layout = [numCols, numRows];

    viewerLayers.push(...viewsAndLayers.layers);
    globalColorScales.push(...viewsAndLayers.colorScales);
    const globalLayerIds = viewsAndLayers.layers.map((layer) => layer.layer.id);

    for (const view of viewsAndLayers.views) {
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
                "est",
            ],
        });
        viewerLayers.push(...view.layers);

        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={view.id} id={view.id}>
                <ColorLegendsContainer
                    colorScales={[...view.colorScales, ...globalColorScales]}
                    height={((mainDivSize.height / 3) * 2) / numCols - 20}
                    position="left"
                />
                <div className="font-bold text-lg flex gap-2 justify-center items-center">
                    <div className="flex gap-2 items-center bg-white p-2 backdrop-blur bg-opacity-50 rounded">
                        <div
                            className="rounded-full h-3 w-3 border border-white"
                            style={{ backgroundColor: view.color ?? undefined }}
                        />
                        <div className="">{view.name}</div>
                    </div>
                </div>
            </DeckGlView>
        );
    }

    if (viewsAndLayers.boundingBox !== null) {
        if (prevBoundingBox !== null) {
            const oldBoundingRect: Rect3D | null = {
                x: prevBoundingBox.x[0],
                y: prevBoundingBox.y[0],
                z: prevBoundingBox.z[0],
                width: prevBoundingBox.x[1] - prevBoundingBox.x[0],
                height: prevBoundingBox.y[1] - prevBoundingBox.y[0],
                depth: prevBoundingBox.z[1] - prevBoundingBox.z[0],
            };

            const newBoundingRect: Rect3D = {
                x: viewsAndLayers.boundingBox.x[0],
                y: viewsAndLayers.boundingBox.y[0],
                z: viewsAndLayers.boundingBox.z[0],
                width: viewsAndLayers.boundingBox.x[1] - viewsAndLayers.boundingBox.x[0],
                height: viewsAndLayers.boundingBox.y[1] - viewsAndLayers.boundingBox.y[0],
                depth: viewsAndLayers.boundingBox.z[1] - viewsAndLayers.boundingBox.z[0],
            };

            if (!outerRectContainsInnerRect(oldBoundingRect, newBoundingRect)) {
                setPrevBoundingBox(viewsAndLayers.boundingBox);
            }
        } else {
            setPrevBoundingBox(viewsAndLayers.boundingBox);
        }
    }

    numLoadingLayers = viewsAndLayers.numLoadingLayers;
    statusWriter.setLoading(viewsAndLayers.numLoadingLayers > 0);

    for (const message of viewsAndLayers.errorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox3D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [
            prevBoundingBox.x[0],
            prevBoundingBox.y[0],
            prevBoundingBox.z[0],
            prevBoundingBox.x[1],
            prevBoundingBox.y[1],
            prevBoundingBox.z[1],
        ];
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);
    layers.push(new PlaceholderLayer({ id: "placeholder" }));
    layers.push(new AxesLayer({ id: "axes-layer", visible: true, ZIncreasingDownwards: true, bounds }));

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <PendingWrapper isPending={numLoadingLayers > 0}>
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ReadoutWrapper
                        views={views}
                        viewportAnnotations={viewportAnnotations}
                        layers={layers}
                        bounds={bounds}
                        workbenchSession={props.workbenchSession}
                        workbenchSettings={props.workbenchSettings}
                    />
                </div>
            </PendingWrapper>
        </div>
    );
}
