import React from "react";

import { Layer as DeckGlLayer, View as DeckGlView } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { BoundingBox3D, LayerPickInfo, MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { converter } from "culori";

import { ContextMenu } from "./ContextMenu";
import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

import { DeckGlInstanceManager, DeckGlInstanceManagerTopic } from "../utils/DeckGlInstanceManager";
import { LabelComponent, LabelOrganizer } from "../utils/LabelOrganizer";
import { Polyline, PolylinesPlugin, PolylinesPluginTopic } from "../utils/PolylinesPlugin";

export type ReadooutWrapperProps = {
    views: ViewsType;
    viewportAnnotations: React.ReactNode[];
    layers: DeckGlLayer[];
    bounds?: BoundingBox3D;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function ReadoutWrapper(props: ReadooutWrapperProps): React.ReactNode {
    const id = React.useId();
    const deckGlRef = React.useRef<DeckGLRef>(null);
    deckGlRef.current?.deck?.needsRedraw;
    const [deckGlManager, setDeckGlManager] = React.useState<DeckGlInstanceManager>(
        new DeckGlInstanceManager(deckGlRef.current)
    );
    const [labelOrganizer, setLabelOrganizer] = React.useState<LabelOrganizer>(new LabelOrganizer(deckGlRef.current));
    const [polylinesPlugin, setPolylinesPlugin] = React.useState<PolylinesPlugin>(new PolylinesPlugin(deckGlManager));

    usePublishSubscribeTopicValue(deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    const intersectionPolylines = useIntersectionPolylines(props.workbenchSession);
    const colorSet = props.workbenchSettings.useColorSet();

    const colorGenerator = React.useCallback(
        function* colorGenerator() {
            const colors: [number, number, number][] = colorSet.getColorArray().map((c) => {
                const rgb = converter("rgb")(c);
                if (!rgb) {
                    return [0, 0, 0];
                }
                return [rgb.r * 255, rgb.g * 255, rgb.b * 255];
            });
            let i = 0;
            while (true) {
                yield colors[i % colors.length];
                i++;
            }
        },
        [colorSet]
    );

    React.useEffect(
        function setupDeckGlManager() {
            const manager = new DeckGlInstanceManager(deckGlRef.current);
            setDeckGlManager(manager);

            labelOrganizer.setDeckRef(deckGlRef.current);

            const polylinesPlugin = new PolylinesPlugin(manager, colorGenerator());
            polylinesPlugin.setPolylines(intersectionPolylines.getPolylines());
            manager.addPlugin(polylinesPlugin);
            setPolylinesPlugin(polylinesPlugin);

            const unsubscribeFromPolylinesPlugin = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.EDITING_POLYLINE_ID)(() => {
                if (polylinesPlugin.getCurrentEditingPolylineId() === null) {
                    intersectionPolylines.setPolylines(polylinesPlugin.getPolylines());
                }
            });

            const unsubscribeFromIntersectionPolylines = intersectionPolylines.subscribe(
                IntersectionPolylinesEvent.CHANGE,
                () => {
                    polylinesPlugin.setPolylines(intersectionPolylines.getPolylines());
                }
            );

            return function cleanupDeckGlManager() {
                manager.beforeDestroy();
                unsubscribeFromPolylinesPlugin();
                unsubscribeFromIntersectionPolylines();
            };
        },
        [intersectionPolylines, colorGenerator, labelOrganizer]
    );

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

    let adjustedLayers: DeckGlLayer[] = [];
    for (const layer of props.layers) {
        adjustedLayers.push(
            layer.clone({
                // @ts-expect-error - we need to add the registerLabels function to the layer
                reportLabels: labelOrganizer.registerLabels.bind(labelOrganizer),
            })
        );
    }
    if (!gridVisible) {
        adjustedLayers = adjustedLayers.filter((layer) => !(layer instanceof AxesLayer));
    }

    const viewportLabels = labelOrganizer.makeLabelComponents();
    const viewportAnnotations = viewportLabels.map((el) => {
        return (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={el.viewportId} id={el.viewportId}>
                <div className="h-full w-full relative top-0 left-0 overflow-hidden">
                    {el.labels.map((label) => (
                        <LabelComponent {...label} />
                    ))}
                </div>
            </DeckGlView>
        );
    });

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
                    // Bounds should only be used in 2D mode - but how do we adjust the camera position in 3D mode?
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
                {viewportAnnotations}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </>
    );
}
