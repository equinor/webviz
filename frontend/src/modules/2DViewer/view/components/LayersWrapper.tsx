import React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import type { Rect2D } from "@lib/utils/geometry";
import { outerRectContainsInnerRect } from "@lib/utils/geometry";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import type { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import type { BoundingBox } from "@modules/_shared/LayerFramework/interfaces";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { BoundingBox2D } from "@webviz/subsurface-viewer";

import type { ViewPortTypeExt, ViewsTypeExt } from "./SubsurfaceViewerWrapper";
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

    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

    const viewports: ViewPortTypeExt[] = [];
    const viewerLayers: DeckGlLayerWithPosition[] = [];
    const colorScales: ColorScaleWithId[] = [];

    const views: ViewsTypeExt = {
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
    colorScales.push(...viewsAndLayers.colorScales);

    const globalLayerIds = viewsAndLayers.layers.map((layer) => layer.layer.id);
    const globalColorScaleIds = viewsAndLayers.colorScales.map((c) => c.id);

    for (const view of viewsAndLayers.views) {
        viewports.push({
            id: view.id,
            name: view.name,
            color: view.color,
            isSync: true,
            layerIds: [...globalLayerIds, ...view.layers.map((layer) => layer.layer.id), "placeholder"],
            colorScaleIds: [...globalColorScaleIds, ...view.colorScales.map((scale) => scale.id)],
        });

        viewerLayers.push(...view.layers);
        colorScales.push(...view.colorScales);
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
        <PendingWrapper className="w-full h-full flex flex-col" isPending={numLoadingLayers > 0}>
            <SubsurfaceViewerWrapper views={views} layers={layers} bounds={bounds} colorScales={colorScales} />
        </PendingWrapper>
    );
}
