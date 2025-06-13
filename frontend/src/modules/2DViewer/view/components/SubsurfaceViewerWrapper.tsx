import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { View as DeckGlView } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, MapMouseEvent, ViewStateType, ViewportType, ViewsType } from "@webviz/subsurface-viewer";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHover, usePublishHoverValue } from "@framework/HoverService";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { getHoverTopicValuesInEvent } from "@modules/_shared/utils/subsurfaceViewerLayers";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";
import { ViewportLabel } from "./ViewportLabel";

export type SubsurfaceViewerWrapperProps = {
    instanceId: string;
    hoverService: HoverService;
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    bounds?: BoundingBox2D;
};

export interface ViewportTypeExtended extends ViewportType {
    color: string | null;
    colorScales: ColorScaleWithId[];
}

export interface ViewsTypeExtended extends ViewsType {
    viewports: ViewportTypeExtended[];
}

export function SubsurfaceViewerWrapper(props: SubsurfaceViewerWrapperProps): React.ReactNode {
    const id = React.useId();
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const deckGlRef = React.useRef<DeckGLRef | null>(null);

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);

    const [numRows] = props.views.layout;

    const [hoveredWorldPos, setHoveredWorldPos] = useHover(HoverTopic.WORLD_POS, props.hoverService, props.instanceId);

    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, props.hoverService, props.instanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.MD, props.hoverService, props.instanceId);

    const handleFitInViewClick = React.useCallback(function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }, []);

    const handleMouseHover = React.useCallback(
        function handleMouseHover(event: MapMouseEvent): void {
            const hoverData = getHoverTopicValuesInEvent(
                event,
                HoverTopic.MD,
                HoverTopic.WELLBORE,
                HoverTopic.WORLD_POS,
            );

            setHoveredWorldPos(hoverData[HoverTopic.WORLD_POS]);
            setHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
            setHoveredMd(hoverData[HoverTopic.MD]);
        },
        [setHoveredWorldPos, setHoveredWellbore, setHoveredMd],
    );

    const handleMouseEvent = React.useCallback(
        function handleMouseEvent(event: MapMouseEvent): void {
            if (event.type === "hover") {
                handleMouseHover(event);
            }
        },
        [handleMouseHover],
    );

    const pickingInfoPerView = React.useMemo(() => {
        if (!deckGlRef.current?.deck?.isInitialized) return {};

        const deck = deckGlRef.current?.deck;
        const deckViewports = deck?.getViewports();
        const { x, y } = hoveredWorldPos ?? {};

        if (!deck || !deckViewports?.length || !x || !y) return {};

        const pickInfoDict: Record<string, PickingInfo[]> = {};

        for (const viewport of deckViewports) {
            const [screenX, screenY] = viewport.project([x, y]);

            const picks = deck.pickMultipleObjects({
                x: screenX + viewport.x,
                y: screenY + viewport.y,
                radius: 5,
            });

            pickInfoDict[viewport.id] = picks;
        }

        return pickInfoDict;
    }, [hoveredWorldPos]);

    return (
        <div ref={mainDivRef} className="h-full w-full">
            <Toolbar onFitInView={handleFitInViewClick} />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                deckGlRef={deckGlRef}
                bounds={props.bounds}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                views={props.views}
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
                // Hide the built in readout box
                // ! If multipicking is false, double-click re-centering stops working
                coords={{ visible: false, multiPicking: true, pickDepth: 2 }}
                triggerHome={triggerHomeCounter}
                pickingRadius={5}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                onMouseEvent={handleMouseEvent}
            >
                {props.views.viewports.map((viewport) => (
                    // @ts-expect-error -- This class is marked as abstract, but seems to just work as is
                    // ? Should we do a proper implementation of the class??
                    <DeckGlView key={viewport.id} id={viewport.id}>
                        <ViewportLabel viewport={viewport} />

                        <ColorLegendsContainer
                            colorScales={viewport.colorScales}
                            height={((mainDivSize.height / 3) * 2) / numRows - 20}
                            position="left"
                        />

                        <ReadoutBoxWrapper
                            compact={true}
                            viewportPicks={pickingInfoPerView[viewport.id]}
                            visible={!!pickingInfoPerView[viewport.id]}
                        />
                    </DeckGlView>
                ))}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </div>
    );
}
