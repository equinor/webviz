import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Rect2D } from "@lib/utils/geometry";
import { outerRectContainsInnerRect } from "@lib/utils/geometry";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import type { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import type { BoundingBox } from "@modules/_shared/LayerFramework/interfaces";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import type { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

import { PlaceholderLayer } from "../customDeckGlLayers/PlaceholderLayer";
import type { DeckGlLayerWithPosition } from "../utils/makeViewsAndLayers";
import { recursivelyMakeViewsAndLayers } from "../utils/makeViewsAndLayers";

export type LayersWrapperProps = {
    layerManager: LayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

    const viewports: ViewportType[] = [];
    const viewerLayers: DeckGlLayerWithPosition[] = [];
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

    const viewsAndLayers = recursivelyMakeViewsAndLayers(props.layerManager.getGroupDelegate());

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
            layerIds: [...globalLayerIds, ...view.layers.map((layer) => layer.layer.id), "placeholder"],
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

    if (viewsAndLayers.boundingBox !== null) {
        if (prevBoundingBox !== null) {
            const oldBoundingRect: Rect2D | null = {
                x: prevBoundingBox.x[0],
                y: prevBoundingBox.y[0],
                width: prevBoundingBox.x[1] - prevBoundingBox.x[0],
                height: prevBoundingBox.y[1] - prevBoundingBox.y[0],
            };

            const newBoundingRect: Rect2D = {
                x: viewsAndLayers.boundingBox.x[0],
                y: viewsAndLayers.boundingBox.y[0],
                width: viewsAndLayers.boundingBox.x[1] - viewsAndLayers.boundingBox.x[0],
                height: viewsAndLayers.boundingBox.y[1] - viewsAndLayers.boundingBox.y[0],
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

    let bounds: BoundingBox2D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.x[0], prevBoundingBox.y[0], prevBoundingBox.x[1], prevBoundingBox.y[1]];
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
