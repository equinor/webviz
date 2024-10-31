import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect2D, rectContainsPoint } from "@lib/utils/geometry";
import { Interfaces } from "@modules/2DViewer/interfaces";
import { LayerManager, LayerManagerTopic } from "@modules/2DViewer/layers/LayerManager";
import { GroupDelegateTopic } from "@modules/2DViewer/layers/delegates/GroupDelegate";
import { usePublishSubscribeTopicValue } from "@modules/2DViewer/layers/delegates/PublishSubscribeDelegate";
import { BoundingBox } from "@modules/2DViewer/layers/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ViewportType } from "@webviz/subsurface-viewer";
import { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { DeckGlLayerWithPosition, recursivelyMakeViewsAndLayers } from "../utils/makeViewsAndLayers";

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

    const groupDelegate = props.layerManager.getGroupDelegate();

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.TREE_REVISION_NUMBER);

    const viewports: ViewportType[] = [];
    const viewerLayers: DeckGlLayerWithPosition[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    const colorScales: ColorScaleWithId[] = [];

    const views: ViewsType = {
        layout: [1, 1],
        viewports: viewports,
        showLabel: false,
    };

    let numCols = 0;
    let numRows = 0;

    let numLoadingLayers = 0;

    const viewsAndLayers = recursivelyMakeViewsAndLayers(props.layerManager);

    numCols = Math.ceil(Math.sqrt(viewsAndLayers.views.length));
    numRows = Math.ceil(viewsAndLayers.views.length / numCols);

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    views.layout = [numCols, numRows];

    viewerLayers.push(...viewsAndLayers.layers);
    colorScales.push(...viewsAndLayers.colorScales);
    const globalLayerIds = viewsAndLayers.layers.map((layer) => layer.layer.id);

    for (const view of viewsAndLayers.views) {
        viewports.push({
            id: view.id,
            name: view.name,
            isSync: true,
            layerIds: [...globalLayerIds, ...view.layers.map((layer) => layer.layer.id)],
        });
        viewerLayers.push(...view.layers);

        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={view.id} id={view.id}>
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

            if (
                !(
                    rectContainsPoint(oldBoundingRect, newBoundingRect) ||
                    rectContainsPoint(newBoundingRect, oldBoundingRect)
                )
            ) {
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

    let bounds: [number, number, number, number] | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.x[0], prevBoundingBox.y[0], prevBoundingBox.x[1], prevBoundingBox.y[1]];
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <PendingWrapper isPending={numLoadingLayers > 0}>
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ColorLegendsContainer
                        colorScales={colorScales}
                        height={mainDivSize.height / 2 - 50}
                        position="left"
                    />
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