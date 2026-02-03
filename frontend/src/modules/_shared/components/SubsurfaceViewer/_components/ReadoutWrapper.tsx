import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { View as DeckGlView } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { LayerPickInfo, LightsType, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { WellLabelLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { WellsPickInfo } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import type { Feature } from "geojson";
import { debounce, isEqual, uniqBy } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import { PolylinesLayer } from "@modules/_shared/customDeckGlLayers/PolylinesLayer";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import {
    DeckGlInstanceManagerTopic,
    type DeckGlInstanceManager,
} from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { PositionReadout } from "./PositionReadout";
import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import {
    SubsurfaceViewerWithCameraState,
    type SubsurfaceViewerWithCameraStateProps,
} from "./SubsurfaceViewerWithCameraState";

export type ReadoutWrapperProps = {
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
    children?: React.ReactNode;
    onViewerHover?: (mouseEvent: MapMouseEvent | null) => void;
    onViewportHover?: (viewport: ViewportType | null) => void;
    onPickingInfoChange?: (pickingInfoPerView: Record<string, PickingInfo[]>) => void;
};

// These are settings that impact performance - make them configurable later if needed
const INITIAL_HOVER_PICKING_DEPTH = 1;
const DEBOUNCED_HOVER_PICKING_DEPTH = 1;
const DEBOUNCED_HOVER_DELAY_MS = 50;
const PICKING_RADIUS = 5;
const USER_PICKING_DEPTH = 6;

// Double-click detection interval
const DOUBLE_CLICK_INTERVAL_MS = 300;

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const { onViewerHover, onViewportHover, onPickingInfoChange } = props;
    const ctx = useDpfSubsurfaceViewerContext();
    const id = React.useId();
    const [hideReadout, setHideReadout] = React.useState<boolean>(false);
    const [pickingCoordinate, setPickingCoordinate] = React.useState<number[]>([]);
    const [pickingInfoPerView, setPickingInfoPerView] = React.useState<Record<string, PickingInfo[]>>({});
    const [readoutMode, setReadoutMode] = React.useState<"hover" | "click">("hover");

    const [storedDeckGlViews, setStoredDeckGlViews] =
        React.useState<SubsurfaceViewerWithCameraStateProps["views"]>(undefined);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const deckGlRef = React.useRef<DeckGLRef | null>(null);
    const clickTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const userPickingDepth = ctx.visualizationMode === "3D" ? 1 : USER_PICKING_DEPTH;

    React.useImperativeHandle(props.deckGlRef, () => deckGlRef.current);
    usePublishSubscribeTopicValue(props.deckGlManager, DeckGlInstanceManagerTopic.REDRAW);

    React.useEffect(
        function onMountEffect() {
            function handleKeydown(event: KeyboardEvent) {
                if (event.key === "Escape") {
                    setReadoutMode("hover");
                    onPickingInfoChange?.({});
                }
            }

            window.addEventListener("keydown", handleKeydown);
            return () => {
                window.removeEventListener("keydown", handleKeydown);
            };
        },
        [onPickingInfoChange],
    );

    const pickAtWorldCoordinates = React.useCallback(
        function pickAtWorldCoordinates(
            worldCoordinates: number[],
            initialPickingInfo: Record<string, PickingInfo[]> = {},
            maxPickingDepth: number,
        ): Record<string, PickingInfo[]> {
            const [x, y, z] = worldCoordinates;

            if (!deckGlRef.current?.deck?.isInitialized) return initialPickingInfo;

            const deck = deckGlRef.current?.deck;
            const viewports = deck?.getViewports();

            if (!deck || !viewports?.length || !x || !y) return initialPickingInfo;

            const pickingInfo: Record<string, PickingInfo[]> = initialPickingInfo;

            // Prepare coordinate for picking by applying vertical scale if z is defined
            const coord = z !== undefined ? [x, y, z * props.verticalScale] : [x, y];

            for (const viewport of viewports) {
                // If we already have picks for this viewport (e.g. from initial hover), skip it if
                // picks are already at max depth
                if (initialPickingInfo[viewport.id] && initialPickingInfo[viewport.id].length === maxPickingDepth) {
                    continue;
                }

                const [screenX, screenY] = viewport.project(coord);
                const picks = deck.pickMultipleObjects({
                    x: screenX + viewport.x,
                    y: screenY + viewport.y,
                    radius: PICKING_RADIUS,
                    depth: maxPickingDepth,
                    unproject3D: true,
                });

                // For some reason, the map layers gets picked multiple times, so we need to filter out duplicates.
                // See issue #webviz-subsurface-components/2320
                // Use layer.id (the actual layer instance) rather than sourceLayer.id to allow
                // picking through multiple stacked layers of the same type
                const uniquePicks = uniqBy(picks, (pick) => pick.layer?.id);

                pickingInfo[viewport.id] = uniquePicks;
            }
            return pickingInfo;
        },
        [props.verticalScale],
    );

    const collectReadoutInformationFromAllViewports = React.useCallback(
        function collectReadoutInformationFromAllViewports(
            worldCoordinates: number[],
            initialPickingInfo: Record<string, PickingInfo[]>,
            pickingDepth: number,
        ): Record<string, PickingInfo[]> {
            const newPickInfoDict = pickAtWorldCoordinates(worldCoordinates, initialPickingInfo, pickingDepth);
            setPickingInfoPerView(newPickInfoDict);
            return newPickInfoDict;
        },
        [pickAtWorldCoordinates],
    );

    const debouncedMultiViewPicking = React.useMemo(
        () => debounce(collectReadoutInformationFromAllViewports, DEBOUNCED_HOVER_DELAY_MS),
        [collectReadoutInformationFromAllViewports],
    );

    const clearReadout = React.useCallback(
        function clearReadout() {
            setPickingInfoPerView({});
            setPickingCoordinate([]);
            onViewerHover?.(null);
            onViewportHover?.(null);
            onPickingInfoChange?.({});
        },
        [onViewerHover, onViewportHover, onPickingInfoChange],
    );

    const handleHoverEvent = React.useCallback(
        function handleHoverEvent(event: MapMouseEvent): void {
            // We have switched to click mode - ignore hover events
            if (readoutMode === "click") {
                return;
            }

            // No picks - clear readout
            if (!event.infos.length) {
                clearReadout();
                return;
            }

            // We need a viewport - if none, clear readout
            const hoveredViewPort = event.infos[0]?.viewport;
            if (!hoveredViewPort) {
                clearReadout();
                return;
            }

            const coordinate = event.infos[0]?.coordinate ?? [];

            if (!hoveredViewPort) {
                return;
            }

            setPickingCoordinate(coordinate);

            // Cancel any pending debounced picking
            debouncedMultiViewPicking.cancel();

            // Hover events should be cheap - we keep it simple as long as the mouse is moving
            // and do multi-view picking only when the mouse stops moving (debounced).
            // Deep picks must be confirmed by user (e.g. click) to avoid performance issues.

            // We have our readout pick - first, update readout information immediately
            const updatedPickingInfoPerView: Record<string, PickingInfo[]> = {};
            updatedPickingInfoPerView[hoveredViewPort.id] = event.infos;

            setPickingInfoPerView(updatedPickingInfoPerView);

            onViewerHover?.(event);
            onViewportHover?.(hoveredViewPort);

            // Now, initiate debounce for picking across all viewports
            const pickingInfoWithCoordinates = event.infos.find((pick) => pick.coordinate?.length);
            if (!pickingInfoWithCoordinates?.coordinate) {
                return;
            }

            debouncedMultiViewPicking(
                pickingInfoWithCoordinates.coordinate,
                { ...updatedPickingInfoPerView },
                DEBOUNCED_HOVER_PICKING_DEPTH,
            );
        },
        [onViewerHover, onViewportHover, debouncedMultiViewPicking, clearReadout, readoutMode],
    );

    const processClickEvent = React.useCallback(
        function processClickEvent(event: MapMouseEvent): void {
            setReadoutMode("click");

            // Deep picking on click - cancel any pending debounced picking
            debouncedMultiViewPicking.cancel();

            // We need a viewport - if none, clear readout
            const hoveredViewPort = event.infos[0]?.viewport;
            if (!hoveredViewPort) {
                setReadoutMode("hover");
                clearReadout();
                return;
            }

            onViewerHover?.(event);
            onViewportHover?.(null);

            setPickingCoordinate(event.infos[0]?.coordinate ?? []);

            const pickingInfoWithCoordinates = event.infos.find((pick) => pick.coordinate?.length);
            if (!pickingInfoWithCoordinates?.coordinate) {
                return;
            }

            const newPickInfoDict = collectReadoutInformationFromAllViewports(
                pickingInfoWithCoordinates.coordinate,
                {},
                userPickingDepth,
            );

            const yieldedPicks = Object.values(newPickInfoDict).some((picks) => picks.length > 0);
            if (!yieldedPicks) {
                // No picks at all - revert to hover mode
                setReadoutMode("hover");
                clearReadout();
                return;
            }

            onPickingInfoChange?.(newPickInfoDict);
        },
        [
            collectReadoutInformationFromAllViewports,
            debouncedMultiViewPicking,
            clearReadout,
            onViewerHover,
            onViewportHover,
            onPickingInfoChange,
            userPickingDepth,
        ],
    );

    const handleClickEvent = React.useCallback(
        function handleClickEvent(event: MapMouseEvent): void {
            // Check if there's a pending click - if so, this is a double-click
            // Clear the pending click and don't process either click
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                return;
            }

            // Schedule the click handling after the double-click interval
            // If another click comes in before the timeout, it will be treated as a double-click
            clickTimeoutRef.current = setTimeout(function processDelayedClick() {
                clickTimeoutRef.current = null;
                processClickEvent(event);
            }, DOUBLE_CLICK_INTERVAL_MS);
        },
        [processClickEvent],
    );

    const [numRows] = props.views.layout;

    const handleMouseEvent = React.useCallback(
        function handleMouseEvent(event: MapMouseEvent): void {
            if (event.type === "hover") {
                handleHoverEvent(event);
                return;
            }

            if (event.type === "click") {
                handleClickEvent(event);
                return;
            }
        },
        [handleClickEvent, handleHoverEvent],
    );

    function getTooltip(info: PickingInfo): string {
        if (
            (info.layer?.constructor === WellLabelLayer || info.sourceLayer?.constructor === WellLabelLayer) &&
            info.object?.wellLabels
        ) {
            return info.object.wellLabels?.join("\n");
        } else if ((info as WellsPickInfo)?.logName) {
            return (info as WellsPickInfo)?.logName ?? "";
        } else if (info.layer?.id === "drawing-layer") {
            return (info as LayerPickInfo).propertyValue?.toFixed(2) ?? "";
        } else if (info.layer?.constructor === PolylinesLayer) {
            return info?.object?.name;
        }
        const feat = info.object as Feature;
        return feat?.properties?.["name"];
    }

    const deckGlProps = props.deckGlManager.makeDeckGlComponentProps({
        deckGlRef,
        id: `subsurface-viewer-${id}`,
        bounds: ctx.bounds,
        views: {
            ...props.views,
            viewports: props.views.viewports,
            layout: props.views?.layout ?? [1, 1],
        },
        lights: {
            ...(ctx.visualizationMode === "2D" ? LIGHTS_2D : LIGHTS_3D),
        },
        verticalScale: props.verticalScale,
        scale: {
            visible: true,
            incrementValue: 100,
            widthPerUnit: 100,
            cssStyle: {
                right: 10,
                top: 10,
            },
        },
        showReadout: false,
        triggerHome: props.triggerHome,
        // We will do deeper picking manually in the onMouseEvent callback
        pickingDepth: INITIAL_HOVER_PICKING_DEPTH,
        pickingRadius: PICKING_RADIUS,
        layers: props.layers,
        onMouseEvent: handleMouseEvent,
        getTooltip: getTooltip,
    });

    if (!isEqual(deckGlProps.views, storedDeckGlViews)) {
        setStoredDeckGlViews(deckGlProps.views);
    }

    const handleCloseReadout = React.useCallback(
        function handleCloseReadout() {
            setReadoutMode("hover");
            clearReadout();
        },
        [clearReadout],
    );

    const handleMainDivLeave = React.useCallback(() => setHideReadout(true), []);
    const handleMainDivEnter = React.useCallback(() => setHideReadout(false), []);

    return (
        <div
            ref={mainDivRef}
            className="h-full w-full relative"
            onMouseEnter={handleMainDivEnter}
            onMouseLeave={handleMainDivLeave}
        >
            {props.children}
            <PositionReadout coordinate={pickingCoordinate} visible={!hideReadout} />
            <SubsurfaceViewerWithCameraState
                {...deckGlProps}
                views={storedDeckGlViews}
                getCameraPosition={ctx.onViewStateChange}
                initialCameraPosition={ctx.viewState ?? undefined}
            >
                {props.views.viewports.map((viewport) => (
                    // @ts-expect-error -- This class is marked as abstract, but seems to just work as is
                    <DeckGlView key={viewport.id} id={viewport.id}>
                        <ViewportLabel viewport={viewport} />
                        <ColorLegendsContainer
                            colorScales={viewport.colorScales}
                            height={((mainDivSize.height / 3) * 2) / numRows - 20}
                            position="left"
                        />

                        <ReadoutBoxWrapper
                            compact={props.views.viewports.length > 1}
                            viewportPicks={pickingInfoPerView[viewport.id]}
                            visible={readoutMode === "click" ? true : !hideReadout}
                            verticalScale={props.verticalScale}
                            onClose={readoutMode === "click" ? handleCloseReadout : undefined}
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

const LIGHTS_2D: LightsType = {
    pointLights: [
        {
            position: [0, 0, 1],
            intensity: 0.0,
        },
    ],
    headLight: {
        intensity: 0.0,
        color: [255, 255, 255],
    },
    ambientLight: { intensity: 2.9, color: [255, 255, 255] },
} as const;

const LIGHTS_3D: LightsType = {
    pointLights: [
        {
            position: [0, 0, 1],
            intensity: 0.0,
        },
    ],
    headLight: {
        intensity: 1.0,
        color: [255, 255, 255],
    },
    ambientLight: { intensity: 1.5, color: [255, 255, 255] },
} as const;
