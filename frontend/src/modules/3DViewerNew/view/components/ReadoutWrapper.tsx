import React from "react";

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { BoundingBox3D, LayerPickInfo, MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ContextMenu } from "./ContextMenu";
import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

import { Polyline } from "../hooks/editablePolylines/types";
import { DeckGlInstanceManager, DeckGlInstanceManagerTopic } from "../utils/DeckGlInstanceManager";
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

    usePublishSubscribeTopicValue(deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    React.useEffect(function setupDeckGlManager() {
        const manager = new DeckGlInstanceManager(deckGlRef.current);
        setDeckGlManager(manager);

        const polylinesPlugin = new PolylinesPlugin(manager);
        manager.addPlugin(polylinesPlugin);
        setPolylinesPlugin(polylinesPlugin);

        return function cleanupDeckGlManager() {
            manager.beforeDestroy();
        };
    }, []);

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [layerPickingInfo, setLayerPickingInfo] = React.useState<LayerPickInfo[]>([]);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [polylines, setPolylines] = React.useState<Polyline[]>([]);

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleGridVisibilityChange(visible: boolean) {
        setGridVisible(visible);
    }

    function handleVerticalScaleChange(value: number) {
        setVerticalScale(value);
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

    function handleMouseEvent(event: MapMouseEvent) {
        const pickingInfo = event.infos;
        setLayerPickingInfo(pickingInfo);
    }

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
                polylinesPlugin={polylinesPlugin}
                onVerticalScaleChange={handleVerticalScaleChange}
                verticalScale={verticalScale}
                hasActivePolyline={Boolean()}
                onPolylineNameChange={handlePolylineNameChange}
                activePolylineName={polylines.find((p) => p.id === activePolylineId)?.name}
            />
            <ContextMenu deckGlManager={deckGlManager} />
            <ReadoutBoxWrapper layerPickInfo={layerPickingInfo} visible />
            <SubsurfaceViewerWithCameraState
                {...deckGlManager.makeDeckGlComponentProps({
                    deckGlRef: deckGlRef,
                    id: `subsurface-viewer-${id}`,
                    views: props.views,
                    cameraPosition: cameraPositionSetByAction ?? undefined,
                    onCameraPositionApplied: () => setCameraPositionSetByAction(null),
                    verticalScale,
                    scale: {
                        visible: true,
                        incrementValue: 100,
                        widthPerUnit: 100,
                        cssStyle: {
                            right: 10,
                            top: 10,
                        },
                    },
                    coords: {
                        visible: false,
                        multiPicking: true,
                        pickDepth: 2,
                    },
                    triggerHome: triggerHomeCounter,
                    pickingRadius: 5,
                    layers: adjustedLayers,
                    onMouseEvent: handleMouseEvent,
                })}
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
