import React from "react";

import { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { BoundingBox3D, LayerPickInfo, MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

import { Polyline, PolylineEditingMode } from "../hooks/editablePolylines/types";
import { DeckGlInstanceManager } from "../utils/DeckGlInstanceManager";
import { PolylinesPlugin } from "../utils/PolylinesPlugin";

export type ReadooutWrapperProps = {
    views: ViewsType;
    viewportAnnotations: React.ReactNode[];
    layers: DeckGlLayer[];
    bounds?: BoundingBox3D;
};

export function ReadoutWrapper(props: ReadooutWrapperProps): React.ReactNode {
    const id = React.useId();
    const deckGlRef = React.useRef<DeckGLRef>(null);
    const [deckGlManager, setDeckGlManager] = React.useState<DeckGlInstanceManager>(
        new DeckGlInstanceManager(deckGlRef.current)
    );
    const [polylinesPlugin, setPolylinesPlugin] = React.useState<PolylinesPlugin>(new PolylinesPlugin(deckGlManager));

    React.useEffect(function setupDeckGlManager() {
        const manager = new DeckGlInstanceManager(deckGlRef.current);
        setDeckGlManager(manager);

        const polylinesPlugin = new PolylinesPlugin(manager);
        manager.addPlugin(polylinesPlugin);
    }, []);

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [polylineEditingMode, setPolylineEditingMode] = React.useState<PolylineEditingMode>(PolylineEditingMode.NONE);
    const [polylines, setPolylines] = React.useState<Polyline[]>([]);

    /*
    const {
        onMouseEvent,
        layers,
        onDrag,
        getCursor,
        cursorPosition,
        contextMenuItems,
        activePolylineId,
        polylines: changedPolylines,
    } = useEditablePolylines({
        deckGlRef,
        polylines,
        editingMode: polylineEditingMode,
        onEditingModeChange: handlePolylineEditingModeChange,
    });

    if (!isEqual(changedPolylines, polylines)) {
        setPolylines(changedPolylines);
    }
        */

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleGridVisibilityChange(visible: boolean) {
        setGridVisible(visible);
    }

    function handlePolylineEditingModeChange(mode: PolylineEditingMode) {
        polylinesPlugin.setEditingMode(mode);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        setLayerPickingInfo(event.infos);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            handleMouseHover(event);
        }

        // onMouseEvent(event);
    }

    function handleVerticalScaleChange(value: number) {
        setVerticalScale(value);
    }

    function handleDrag(info: PickingInfo): void {
        // onDrag(info);
    }

    const activePolylineId = polylinesPlugin.getCurrentEditingPolylineId();

    const handlePolylineNameChange = React.useCallback(
        function handlePolylineNameChange(name: string): void {
            if (!activePolylineId) {
                return;
            }

            setPolylines((prev) =>
                prev.map((polyline) => {
                    if (polyline.id === activePolylineId) {
                        return {
                            ...polyline,
                            name,
                        };
                    }

                    return polyline;
                })
            );
        },
        [activePolylineId]
    );

    let adjustedLayers = [...props.layers];
    if (!gridVisible) {
        adjustedLayers = adjustedLayers.filter((layer) => !(layer instanceof AxesLayer));
    }

    // adjustedLayers.push(...layers);

    return (
        <>
            <Toolbar
                onFitInView={handleFitInViewClick}
                onGridVisibilityChange={handleGridVisibilityChange}
                onPolylineEditingModeChange={handlePolylineEditingModeChange}
                onVerticalScaleChange={handleVerticalScaleChange}
                verticalScale={verticalScale}
                hasActivePolyline={Boolean()}
                polylineEditingMode={polylineEditingMode}
                onPolylineNameChange={handlePolylineNameChange}
                activePolylineName={polylines.find((p) => p.id === activePolylineId)?.name}
            />
            {/*cursorPosition && contextMenuItems.length && (
                <Menu style={{ position: "absolute", top: cursorPosition[1], left: cursorPosition[0] }}>
                    {contextMenuItems.map((item, index) => (
                        <MenuItem key={index} onClick={item.onClick} className="flex gap-2">
                            {item.icon}
                            {item.label}
                        </MenuItem>
                    ))}
                </Menu>
            )*/}
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
            <SubsurfaceViewerWithCameraState
                deckGlRef={deckGlRef}
                id={`subsurface-viewer-${id}`}
                views={props.views}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
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
                {...deckGlManager.makeDeckGlComponentProps(adjustedLayers)}
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
