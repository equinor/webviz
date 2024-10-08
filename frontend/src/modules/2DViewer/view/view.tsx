import React from "react";

import { View as DeckGlView } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect2D, rectContainsPoint } from "@lib/utils/geometry";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { useQueryClient } from "@tanstack/react-query";
import { LayerPickInfo, ViewportType } from "@webviz/subsurface-viewer";
import { MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ReadoutBoxWrapper } from "./components/ReadoutBoxWrapper";
import { Toolbar } from "./components/Toolbar";
import { DeckGlLayerWithPosition, recursivelyMakeViewsAndLayers } from "./utils/makeViewsAndLayers";

import { Interfaces } from "../interfaces";
import { LayerManager, LayerManagerTopic } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { GroupDelegate, GroupDelegateTopic } from "../layers/delegates/GroupDelegate";
import { BoundingBox } from "../layers/interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const id = React.useId();

    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox | null>(null);
    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);

    const queryClient = useQueryClient();
    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const groupDelegate = layerManager?.getGroupDelegate() ?? new GroupDelegate(null);

    usePublishSubscribeTopicValue(
        layerManager ?? new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient),
        LayerManagerTopic.LAYER_DATA_REVISION
    );

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

    if (layerManager) {
        const viewsAndLayers = recursivelyMakeViewsAndLayers(layerManager);

        numCols = Math.ceil(Math.sqrt(viewsAndLayers.views.length));
        numRows = Math.ceil(viewsAndLayers.views.length / numCols);

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
    }

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        setLayerPickingInfo(event.infos);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }
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
                    <Toolbar onFitInView={handleFitInViewClick} />
                    <ColorLegendsContainer
                        colorScales={colorScales}
                        height={mainDivSize.height / 2 - 50}
                        position="left"
                    />
                    <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
                    <SubsurfaceViewerWithCameraState
                        id={`subsurface-viewer-${id}`}
                        views={views}
                        bounds={bounds}
                        cameraPosition={cameraPositionSetByAction ?? undefined}
                        onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                        onMouseEvent={handleMouseEvent}
                        layers={layers}
                        scale={{
                            visible: true,
                            incrementValue: 100,
                            widthPerUnit: 100,
                            cssStyle: {
                                right: 10,
                                top: 10,
                            },
                        }}
                        coords={{
                            visible: false,
                            multiPicking: true, //polylineEditPointsModusActive,
                            pickDepth: 2, // polylineEditPointsModusActive ? 2 : undefined,
                        }}
                        triggerHome={triggerHomeCounter}
                    >
                        {viewportAnnotations}
                    </SubsurfaceViewerWithCameraState>
                    {views.viewports.length === 0 && (
                        <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                            Please add views and layers in the settings panel.
                        </div>
                    )}
                </div>
            </PendingWrapper>
        </div>
    );
}
