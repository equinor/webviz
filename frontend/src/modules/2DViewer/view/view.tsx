import React from "react";

import { View as DeckGlView } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Rect2D, rectContainsPoint } from "@lib/utils/geometry";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { useQueryClient } from "@tanstack/react-query";
import { ViewportType } from "@webviz/subsurface-viewer";
import { ViewStateType, ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { Axes2DLayer } from "@webviz/subsurface-viewer/dist/layers";

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
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);

    const queryClient = useQueryClient();
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
        showLabel: true,
    };

    let numCols = 0;
    let numRows = 0;

    if (layerManager) {
        const viewsAndLayers = recursivelyMakeViewsAndLayers(layerManager);

        numCols = Math.ceil(Math.sqrt(viewsAndLayers.views.length));
        numRows = Math.ceil(viewsAndLayers.views.length / numCols);

        views.layout = [numCols, numRows];

        viewerLayers.push(...viewsAndLayers.layers);
        const globalLayerIds = viewsAndLayers.layers.map((layer) => layer.layer.id);

        for (const view of viewsAndLayers.views) {
            viewports.push({
                id: view.id,
                name: view.name,
                isSync: true,
                layerIds: ["axes", ...globalLayerIds, ...view.layers.map((layer) => layer.layer.id)],
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

        viewerLayers.push({
            layer: new Axes2DLayer({
                id: "axes",
                axisColor: [80, 80, 80],
                backgroundColor: [250, 250, 250],
            }),
            position: -1,
        });

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
    }

    function handleFitInViewClick() {
        if (prevBoundingBox === null) {
            return;
        }
        const targetX = (prevBoundingBox.x[0] + prevBoundingBox.x[1]) / 2;
        const targetY = (prevBoundingBox.y[0] + prevBoundingBox.y[1]) / 2;
        const targetZ = (prevBoundingBox.z[0] + prevBoundingBox.z[1]) / 2;

        setCameraPositionSetByAction({
            rotationOrbit: 100,
            rotationX: 90,
            target: [targetX, targetY, targetZ],
            zoom: NaN,
        });
    }

    function handleVerticalScaleDecrease() {
        setVerticalScale((prev) => prev - 0.1);
    }

    function handleVerticalScaleIncrease() {
        setVerticalScale((prev) => prev + 0.1);
    }

    let bounds: [number, number, number, number] | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.x[0], prevBoundingBox.x[1], prevBoundingBox.y[0], prevBoundingBox.y[1]];
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <Toolbar
                onFitInView={handleFitInViewClick}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                verticalScale={verticalScale}
            />
            <ColorLegendsContainer colorScales={colorScales} height={mainDivSize.height / 2 - 50} position="left" />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                views={views}
                bounds={bounds}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
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
                verticalScale={verticalScale}
            >
                {viewportAnnotations}
            </SubsurfaceViewerWithCameraState>
        </div>
    );
}
