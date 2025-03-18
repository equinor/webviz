import React from "react";

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { HoverService } from "@framework/HoverService";
import { HoverTopic, usePublishHoverValue } from "@framework/HoverService";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { getHoverTopicValuesInEvent } from "@modules/_shared/utils/subsurfaceViewerLayers";
import type { BoundingBox2D, LayerPickInfo, MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

export type ReadooutWrapperProps = {
    hoverService: HoverService;
    instanceId: string;
    views: ViewsType;
    viewportAnnotations: React.ReactNode[];
    layers: DeckGlLayer[];
    bounds?: BoundingBox2D;
};

export function ReadoutWrapper(props: ReadooutWrapperProps): React.ReactNode {
    const id = React.useId();

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);

    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS, props.hoverService, props.instanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, props.hoverService, props.instanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.MD, props.hoverService, props.instanceId);

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        setLayerPickingInfo(event.infos);

        const hoverData = getHoverTopicValuesInEvent(event, HoverTopic.MD, HoverTopic.WELLBORE, HoverTopic.WORLD_POS);

        setHoveredWorldPos(hoverData[HoverTopic.WORLD_POS]);
        setHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
        setHoveredMd(hoverData[HoverTopic.MD]);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }
    }

    return (
        <>
            <Toolbar onFitInView={handleFitInViewClick} />
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                views={props.views}
                bounds={props.bounds}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                onMouseEvent={handleMouseEvent}
                layers={props.layers}
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
                    multiPicking: true,
                    pickDepth: 2,
                }}
                triggerHome={triggerHomeCounter}
                pickingRadius={5}
            >
                {props.viewportAnnotations}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </>
    );
}
