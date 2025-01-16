import React from "react";

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { BoundingBox3D, LayerPickInfo, MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

import { useEditablePolylines } from "../hooks/editablePolylines/editablePolylinesHook";

export type ReadooutWrapperProps = {
    views: ViewsType;
    viewportAnnotations: React.ReactNode[];
    layers: DeckGlLayer[];
    bounds?: BoundingBox3D;
};

export function ReadoutWrapper(props: ReadooutWrapperProps): React.ReactNode {
    const id = React.useId();

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [polylineEditingActive, setPolylineEditingActive] = React.useState<boolean>(false);

    const { onMouseEvent, layers } = useEditablePolylines({ polylines: [], editingActive: polylineEditingActive });

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleGridVisibilityChange(visible: boolean) {
        setGridVisible(visible);
    }

    function handleEditPolylines() {
        setPolylineEditingActive((prev) => !prev);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        setLayerPickingInfo(event.infos);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }

        onMouseEvent(event);
    }

    function handleVerticalScaleChange(value: number) {
        setVerticalScale(value);
    }

    let adjustedLayers = [...props.layers];
    if (!gridVisible) {
        adjustedLayers = adjustedLayers.filter((layer) => !(layer instanceof AxesLayer));
    }

    adjustedLayers.push(...layers);

    return (
        <>
            <Toolbar
                onFitInView={handleFitInViewClick}
                onGridVisibilityChange={handleGridVisibilityChange}
                onEditPolyline={handleEditPolylines}
                onVerticalScaleChange={handleVerticalScaleChange}
                verticalScale={verticalScale}
            />
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                views={props.views}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                onMouseEvent={handleMouseEvent}
                layers={adjustedLayers}
                verticalScale={verticalScale}
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
