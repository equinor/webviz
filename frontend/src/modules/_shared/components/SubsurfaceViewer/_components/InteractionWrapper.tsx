import React from "react";

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";
import { converter, formatHex } from "culori";

import { HoverTopic, useHover } from "@framework/HoverService";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import { useColorSet } from "@framework/WorkbenchSettings";
import { positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";
import { DeckGlInstanceManager } from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";
import {
    PolylineEditingMode,
    PolylinesPlugin,
    PolylinesPluginTopic,
    type Polyline,
} from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { ContextMenu } from "./ContextMenu";
import { ControlsInfoBox } from "./ControlsInfoBox";
import { HoverVisualizationWrapper, PolylineMarkerStore } from "./HoverVisualizationWrapper";
import type { ReadoutWrapperProps } from "./ReadoutWrapper";
import { Toolbar } from "./Toolbar";

export type InteractionWrapperProps = Pick<ReadoutWrapperProps, "views" | "layers"> & {
    fieldId: string;
    usedPolylineIds: string[];
};

function convertIntersectionPolylinesToPolylines(polylines: IntersectionPolyline[]): Polyline[] {
    return polylines.map((polyline) => {
        const color = converter("rgb")(polyline.color);
        return {
            id: polyline.id,
            name: polyline.name,
            color: color ? [color.r * 255, color.g * 255, color.b * 255] : [0, 0, 0],
            path: polyline.path,
        };
    });
}

function convertPolylinesToIntersectionPolylines(polylines: Polyline[], fieldId: string): IntersectionPolyline[] {
    return polylines.map((polyline) => {
        const color = converter("rgb")(`rgb(${polyline.color[0]}, ${polyline.color[1]}, ${polyline.color[2]})`);
        return {
            id: polyline.id,
            name: polyline.name,
            color: color ? formatHex(color) : "#000000",
            path: polyline.path,
            fieldId,
        };
    });
}

export function InteractionWrapper(props: InteractionWrapperProps): React.ReactNode {
    const context = useDpfSubsurfaceViewerContext();
    const { onVerticalScaleChange } = context;

    const deckGlRef = React.useRef<DeckGLRef>(null);
    const intersectionPolylines = useIntersectionPolylines(context.workbenchSession);

    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(context.initialVerticalScale);
    const [activePolylineName, setActivePolylineName] = React.useState<string | undefined>(undefined);

    const deckGlManagerRef = React.useRef<DeckGlInstanceManager>(new DeckGlInstanceManager(deckGlRef.current));
    const polylinesPluginRef = React.useRef<PolylinesPlugin>(new PolylinesPlugin(deckGlManagerRef.current));
    const polylineMarkerStoreRef = React.useRef(new PolylineMarkerStore());

    const colorSet = useColorSet(context.workbenchSettings);

    const [hoveredPolylineLengthAlong, setHoveredPolylineLengthAlong] = useHover(
        HoverTopic.POLYLINE_LENGTH_ALONG,
        context.hoverService,
        context.moduleInstanceId,
    );

    // Use a ref so the subscription closure in useLayoutEffect always calls the latest publish function
    const publishHoveredPolylineLengthAlongRef = React.useRef(setHoveredPolylineLengthAlong);
    publishHoveredPolylineLengthAlongRef.current = setHoveredPolylineLengthAlong;

    const colorArray = React.useMemo((): [number, number, number][] => {
        return colorSet.getColorArray().map((c) => {
            const rgb = converter("rgb")(c);
            return rgb ? [rgb.r * 255, rgb.g * 255, rgb.b * 255] : [0, 0, 0];
        });
    }, [colorSet]);

    const colorGenerator = React.useMemo(
        () =>
            function* () {
                let i = 0;
                while (true) {
                    yield colorArray[i % colorArray.length];
                    i++;
                }
            },
        [colorArray],
    );

    React.useEffect(
        function updateVisiblePolylines() {
            if (polylinesPluginRef.current) {
                polylinesPluginRef.current.setVisiblePolylineIds(props.usedPolylineIds ?? []);
            }
        },
        [props.usedPolylineIds],
    );

    React.useEffect(
        function notifyAboutVerticalScaleChangeEffect() {
            onVerticalScaleChange?.(verticalScale);
        },
        [verticalScale, onVerticalScaleChange],
    );

    React.useLayoutEffect(
        function setPolylineMarkerPositionEffect() {
            if (!hoveredPolylineLengthAlong) {
                polylineMarkerStoreRef.current.setPosition(null);
                return;
            }
            const plugin = polylinesPluginRef.current;
            if (!plugin || plugin.getEditingMode() === PolylineEditingMode.DISABLED) {
                return;
            }

            const polyline = plugin.getPolylines().find((p) => p.id === hoveredPolylineLengthAlong.polylineId);
            const pos = polyline ? positionAtLengthAlong(polyline.path, hoveredPolylineLengthAlong.lengthAlong) : null;
            polylineMarkerStoreRef.current.setPosition(pos);
        },
        [hoveredPolylineLengthAlong],
    );

    React.useLayoutEffect(
        function setupDeckGlManager() {
            // Imperative Deck.gl plugin setup — must happen before paint and before useEffect runs
            // to avoid visual artifacts or plugin timing issues.
            const polylineMarkerStore = polylineMarkerStoreRef.current;
            const manager = new DeckGlInstanceManager(deckGlRef.current);
            deckGlManagerRef.current = manager;

            const polylinesPlugin = new PolylinesPlugin(manager, colorGenerator());
            polylinesPlugin.setPolylines(
                convertIntersectionPolylinesToPolylines([
                    ...intersectionPolylines.getPolylines().filter((p) => p.fieldId === props.fieldId),
                ]),
            );
            manager.addPlugin(polylinesPlugin);
            polylinesPluginRef.current = polylinesPlugin;

            const unsubscribePolylineHover = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.POLYLINE_HOVER)(() => {
                const hoverData = polylinesPlugin.getPolylineHoverData();
                publishHoveredPolylineLengthAlongRef.current(hoverData);
            });

            const unsubscribeEditingMode = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.EDITING_MODE)(() => {
                if (polylinesPlugin.getEditingMode() === PolylineEditingMode.DISABLED) {
                    polylineMarkerStore.setPosition(null);
                }
            });

            const unsubscribeFromPolylinesPlugin = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.EDITING_POLYLINE_ID)(() => {
                const editingId = polylinesPlugin.getCurrentEditingPolylineId();
                // Only update intersection polylines when not editing a polyline
                if (editingId === null) {
                    // We haven't changed all polylines, only the ones related to this field
                    intersectionPolylines.updatePolylines(
                        convertPolylinesToIntersectionPolylines(polylinesPlugin.getPolylines(), props.fieldId),
                    );
                } else {
                    const current = polylinesPlugin.getPolylines().find((p) => p.id === editingId);
                    setActivePolylineName(current?.name);
                }
            });

            const unsubscribeFromIntersectionPolylines = intersectionPolylines.subscribe(
                IntersectionPolylinesEvent.CHANGE,
                () => {
                    polylinesPlugin.setPolylines(
                        convertIntersectionPolylinesToPolylines([
                            ...intersectionPolylines.getPolylines().filter((p) => p.fieldId === props.fieldId),
                        ]),
                    );
                },
            );

            return function cleanupDeckGlManager() {
                manager.beforeDestroy();
                polylineMarkerStore.setPosition(null);
                unsubscribePolylineHover();
                unsubscribeEditingMode();
                unsubscribeFromPolylinesPlugin();
                unsubscribeFromIntersectionPolylines();
            };
        },
        [intersectionPolylines, colorGenerator, props.fieldId],
    );

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleGridVisibilityChange(visible: boolean) {
        setGridVisible(visible);
    }

    function handleVerticalScaleChange(value: number) {
        setVerticalScale(value);
    }

    const handlePolylineNameChange = React.useCallback((name: string) => {
        const plugin = polylinesPluginRef.current;
        const editingId = plugin?.getCurrentEditingPolylineId();
        if (!plugin || !editingId) return;

        const updated = plugin
            .getPolylines()
            .map((polyline) => (polyline.id === editingId ? { ...polyline, name } : polyline));
        plugin.setPolylines(updated);
        setActivePolylineName(name);
    }, []);

    let adjustedLayers: DeckGlLayer[] = [...props.layers];
    let adjustedViewports = [...props.views.viewports];
    if (!gridVisible) {
        adjustedLayers = adjustedLayers.filter((layer) => !(layer instanceof AxesLayer));
        adjustedViewports = adjustedViewports.map((viewport) => ({
            ...viewport,
            layerIds: viewport.layerIds?.filter((layerId) => layerId !== "axes"),
        }));
    }

    return (
        <HoverVisualizationWrapper
            deckGlRef={deckGlRef}
            layers={adjustedLayers}
            views={{ ...props.views, viewports: adjustedViewports }}
            deckGlManager={deckGlManagerRef.current}
            verticalScale={verticalScale}
            triggerHome={triggerHomeCounter}
            polylineMarkerStore={polylineMarkerStoreRef.current}
        >
            <Toolbar
                hideVerticalScaleControls={context.visualizationMode === "2D"}
                onFitInView={handleFitInViewClick}
                onGridVisibilityChange={handleGridVisibilityChange}
                polylinesPlugin={polylinesPluginRef.current}
                onVerticalScaleChange={handleVerticalScaleChange}
                verticalScale={verticalScale}
                hasActivePolyline={Boolean(polylinesPluginRef.current.getCurrentEditingPolylineId())}
                onPolylineNameChange={handlePolylineNameChange}
                activePolylineName={activePolylineName}
            />
            <ContextMenu deckGlManager={deckGlManagerRef.current} />
            <ControlsInfoBox />
        </HoverVisualizationWrapper>
    );
}
