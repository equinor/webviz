import React from "react";

import { View as DeckGlView } from "@deck.gl/core";
import { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect2D, outerRectContainsInnerRect } from "@lib/utils/geometry";
import { ObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/ObservedSurfaceLayer";
import { RealizationSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/StatisticalSurfaceLayer";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeObservedSurfaceLayer";
import { makeRealizationSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/visualization/makeStatisticalSurfaceLayer";
import { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import {
    DataLayerManager,
    LayerManagerTopic,
} from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { BoundingBox } from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import {
    LayerWithPosition,
    VisualizationFactory,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { PlaceholderLayer } from "../customDeckGlLayers/PlaceholderLayer";

export type LayersWrapperProps = {
    layerManager: DataLayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

type T = MakeSettingTypesMap<
    | [
          SettingType.ENSEMBLE,
          SettingType.REALIZATION,
          SettingType.ATTRIBUTE,
          SettingType.SURFACE_NAME,
          SettingType.TIME_OR_INTERVAL
      ]
    | [SettingType.ENSEMBLE, SettingType.REALIZATION, SettingType.ATTRIBUTE, SettingType.SURFACE_NAME]
>;

const VISUALIZATION_FACTORY = new VisualizationFactory<VisualizationTarget.DECK_GL>();
VISUALIZATION_FACTORY.registerVisualizationFunction(ObservedSurfaceLayer, makeObservedSurfaceLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(RealizationSurfaceLayer, makeRealizationSurfaceLayer);
VISUALIZATION_FACTORY.registerVisualizationFunction(StatisticalSurfaceLayer, makeStatisticalSurfaceLayer);

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
