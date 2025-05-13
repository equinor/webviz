import React from "react";

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import { View as DeckGlView } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, MapMouseEvent, ViewStateType, ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { useMultiViewCursorTracking } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewCursorTracking";
import { useMultiViewPicking } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";

import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";
import { ViewPortLabel } from "./ViewPortLabel";

export type SubsurfaceViewerWrapperProps = {
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    bounds?: BoundingBox2D;
};

export interface ViewPortTypeExtended extends ViewportType {
    color: string | null;
    colorScales: ColorScaleWithId[];
}

export interface ViewsTypeExtended extends ViewsType {
    viewports: ViewPortTypeExtended[];
}

export function SubsurfaceViewerWrapper(props: SubsurfaceViewerWrapperProps): React.ReactNode {
    const id = React.useId();
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const deckGlRef = React.useRef<DeckGLRef | null>(null);

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [hideReadout, setHideReadout] = React.useState<boolean>(false);

    const [numRows] = props.views.layout;

    const viewports = props.views?.viewports ?? [];
    const layers = props.layers ?? [];

    const { pickingInfoPerView, activeViewportId, getPickingInfo } = useMultiViewPicking({
        deckGlRef,
        pickDepth: 3,
        multiPicking: true,
    });

    const { viewports: adjustedViewports, layers: adjustedLayers } = useMultiViewCursorTracking({
        activeViewportId,
        viewports,
        layers,
        worldCoordinates: pickingInfoPerView[activeViewportId]?.coordinates ?? null,
        crosshairProps: {
            // ! We hide the crosshair by opacity since toggling "visible" causes a full asset load/unload
            color: [255, 255, 255, hideReadout ? 0 : 255],
            sizePx: 32,
        },
    });

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        getPickingInfo(event);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }
    }

    // Make hover hide when you leave the module
    const handleMainDivLeave = React.useCallback(() => setHideReadout(true), []);
    const handleMainDivEnter = React.useCallback(() => setHideReadout(false), []);

    return (
        <div
            ref={mainDivRef}
            className="h-full w-full"
            onMouseEnter={handleMainDivEnter}
            onMouseLeave={handleMainDivLeave}
        >
            <Toolbar onFitInView={handleFitInViewClick} />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                deckGlRef={deckGlRef}
                bounds={props.bounds}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                views={{ ...props.views, viewports: adjustedViewports }}
                // views={props.views}
                layers={adjustedLayers}
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
                        <ViewPortLabel viewPort={viewport} />

                        <ColorLegendsContainer
                            colorScales={viewport.colorScales}
                            height={((mainDivSize.height / 3) * 2) / numRows - 20}
                            position="left"
                        />

                        <ReadoutBoxWrapper
                            compact={props.views.viewports.length > 1}
                            viewportPickInfo={pickingInfoPerView[viewport.id]}
                            visible={!hideReadout && !!pickingInfoPerView[viewport.id]}
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
