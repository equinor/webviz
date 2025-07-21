import React from "react";

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";
import { converter } from "culori";

import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";

import { DeckGlInstanceManager } from "../utils/DeckGlInstanceManager";
import { type Polyline, PolylinesPlugin, PolylinesPluginTopic } from "../utils/PolylinesPlugin";

import { ContextMenu } from "./ContextMenu";
import { ControlsInfoBox } from "./ControlsInfoBox";
import { HoverVisualizationWrapper } from "./HoverVisualizationWrapper";
import { type ReadoutWrapperProps } from "./ReadoutWrapper";
import { Toolbar } from "./Toolbar";

export type InteractionWrapperProps = Omit<
    ReadoutWrapperProps,
    "deckGlManager" | "triggerHome" | "verticalScale" | "deckGlRef"
> & {
    fieldId: string;
    usedPolylineIds: string[];
};

function convertPolylines(polylines: Polyline[], fieldId: string): IntersectionPolyline[] {
    return polylines.map((polyline) => ({
        id: polyline.id,
        name: polyline.name,
        color: polyline.color,
        path: polyline.path,
        fieldId,
    }));
}

export function InteractionWrapper(props: InteractionWrapperProps): React.ReactNode {
    const deckGlRef = React.useRef<DeckGLRef>(null);
    const intersectionPolylines = useIntersectionPolylines(props.workbenchSession);

    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(10);
    const [activePolylineName, setActivePolylineName] = React.useState<string | undefined>(undefined);

    const deckGlManagerRef = React.useRef<DeckGlInstanceManager | null>(null);
    const polylinesPluginRef = React.useRef<PolylinesPlugin | null>(null);

    const colorSet = props.workbenchSettings.useColorSet();

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
                polylinesPluginRef.current.setVisiblePolylineIds(props.usedPolylineIds);
            }
        },
        [props.usedPolylineIds],
    );

    React.useLayoutEffect(
        function setupDeckGlManager() {
            // Imperative Deck.gl plugin setup — must happen before paint and before useEffect runs
            // to avoid visual artifacts or plugin timing issues.
            const manager = new DeckGlInstanceManager(deckGlRef.current);
            deckGlManagerRef.current = manager;

            const polylinesPlugin = new PolylinesPlugin(manager, colorGenerator());
            polylinesPlugin.setPolylines([...intersectionPolylines.getPolylines()]);
            manager.addPlugin(polylinesPlugin);
            polylinesPluginRef.current = polylinesPlugin;

            const unsubscribeFromPolylinesPlugin = polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.EDITING_POLYLINE_ID)(() => {
                const editingId = polylinesPlugin.getCurrentEditingPolylineId();
                if (editingId == null) {
                    intersectionPolylines.setPolylines(convertPolylines(polylinesPlugin.getPolylines(), props.fieldId));
                } else {
                    const current = polylinesPlugin.getPolylines().find((p) => p.id === editingId);
                    setActivePolylineName(current?.name);
                }
            });

            const unsubscribeFromIntersectionPolylines = intersectionPolylines.subscribe(
                IntersectionPolylinesEvent.CHANGE,
                () => {
                    polylinesPlugin.setPolylines([...intersectionPolylines.getPolylines()]);
                },
            );

            return function cleanupDeckGlManager() {
                manager.beforeDestroy();
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

    if (!polylinesPluginRef.current || !deckGlManagerRef.current) {
        return null;
    }

    return (
        <HoverVisualizationWrapper
            {...props}
            deckGlRef={deckGlRef}
            layers={adjustedLayers}
            views={{ ...props.views, viewports: adjustedViewports }}
            deckGlManager={deckGlManagerRef.current}
            verticalScale={verticalScale}
            triggerHome={triggerHomeCounter}
        >
            <Toolbar
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
