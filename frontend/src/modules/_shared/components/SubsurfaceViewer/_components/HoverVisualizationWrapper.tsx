import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash-es";

import type { HoverData, HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { PickingRayLayer } from "@modules/_shared/customDeckGlLayers/PickingRayLayer";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import { getPolylineIdFromFenceId, makeFenceSourceIdForPolyLine } from "@modules/_shared/utils/fence";
import { lengthAlongAtXyPosition, positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";
import type { DeckGlInstanceManager } from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";
import type { PolylinesPlugin } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";
import { PolylineEditingMode, PolylinesPluginTopic } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";
import { getHoverDataInPicks } from "@modules/_shared/utils/subsurfaceViewerLayers";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { ReadoutWrapper } from "./ReadoutWrapper";

export type HoverVisualizationWrapperProps = {
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
    polylinesPlugin: PolylinesPlugin;
    children?: React.ReactNode;
};

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const [currentlyHoveredViewport, setCurrentlyHoveredViewport] = React.useState<null | string>(null);
    // Store unscaled coordinates - converted at pick time so they stay correct when verticalScale changes
    const [unscaledCoordinatesPerView, setUnscaledCoordinatesPerView] = React.useState<
        Record<string, [number, number, number][]>
    >({});

    const ctx = useDpfSubsurfaceViewerContext();
    const publishHoveredWorldPos = usePublishHoverValue(
        HoverTopic.WORLD_POS_UTM,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );
    const publishHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, ctx.hoverService, ctx.moduleInstanceId);
    const publishHoveredMd = usePublishHoverValue(HoverTopic.WELLBORE_MD, ctx.hoverService, ctx.moduleInstanceId);
    const publishHoveredFence = usePublishHoverValue(HoverTopic.FENCE, ctx.hoverService, ctx.moduleInstanceId);

    const crossHairLayer = useCrosshairLayer(ctx.bounds, ctx.hoverService, ctx.moduleInstanceId);
    const pickingRayLayers = usePickingRayLayers(unscaledCoordinatesPerView, false);
    const polylineHoverMarkerLayer = usePolylineHoverMarkerLayer(
        props.polylinesPlugin,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const hoverVisualizationGroups = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        ctx.visualizationAssemblerProduct,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const publishHoveredFenceRef = React.useRef(publishHoveredFence);
    publishHoveredFenceRef.current = publishHoveredFence;

    React.useEffect(
        function subscribeToPolylineHover() {
            return props.polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.POLYLINE_HOVER)(() => {
                const polylineData = props.polylinesPlugin.getPolylineHoverData();

                let payload: HoverData[HoverTopic.FENCE] = null;

                if (polylineData) {
                    const fenceLengthAlong = convertPolylineLengthAlongToFenceLengthAlong(
                        polylineData.path,
                        polylineData.lengthAlong,
                    );

                    if (fenceLengthAlong) {
                        // Also grab the polyline's 3D position as the depth
                        const polylinePosition = positionAtLengthAlong(polylineData.path, polylineData.lengthAlong);
                        const polylineDepth = -polylinePosition![2];

                        payload = {
                            fenceId: makeFenceSourceIdForPolyLine(polylineData.polylineId),
                            lengthAlong: fenceLengthAlong,
                            depth: polylineDepth,
                        };
                    }
                }
                publishHoveredFenceRef.current(payload, "polyline-plugin");
            });
        },
        [props.polylinesPlugin],
    );

    const adjustedLayers = [...props.layers];
    const adjustedViews = {
        ...props.views,
        viewports: props.views.viewports.map((viewport) => {
            const viewportLayerIds = viewport.layerIds ? [...viewport.layerIds] : [];
            viewportLayerIds.push(POLYLINE_HOVER_MARKER_LAYER_ID);

            for (const hoverVisualizationGroup of hoverVisualizationGroups) {
                if (hoverVisualizationGroup.groupId !== viewport.id) continue;

                for (const layer of hoverVisualizationGroup.hoverVisualizations) {
                    if (!adjustedLayers.some(({ id }) => layer.id === id)) {
                        adjustedLayers.push(layer);
                    }
                    if (!viewportLayerIds.includes(layer.id)) {
                        viewportLayerIds.push(layer.id);
                    }
                }
            }

            if (viewport.id !== currentlyHoveredViewport) {
                viewportLayerIds.push(HOVER_CROSSHAIR_LAYER_ID);
            }

            const pickingRayLayer = pickingRayLayers[viewport.id];
            if (pickingRayLayer) {
                adjustedLayers.push(pickingRayLayer);
                viewportLayerIds.push(pickingRayLayer.id);
            }

            return {
                ...viewport,
                layerIds: viewportLayerIds,
            };
        }),
    };

    const handleViewerHover = React.useCallback(
        function handleViewerHover(mouseEvent: MapMouseEvent | null) {
            const hoverData = getHoverDataInPicks(
                mouseEvent?.infos ?? [],
                HoverTopic.WELLBORE_MD,
                HoverTopic.WELLBORE,
                HoverTopic.WORLD_POS_UTM,
                HoverTopic.FENCE,
            );

            publishHoveredWorldPos(hoverData[HoverTopic.WORLD_POS_UTM]);
            publishHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
            publishHoveredMd(hoverData[HoverTopic.WELLBORE_MD]);
            publishHoveredFence(hoverData[HoverTopic.FENCE], "provider-layers");
        },
        [publishHoveredMd, publishHoveredFence, publishHoveredWellbore, publishHoveredWorldPos],
    );

    const handleViewportHover = React.useCallback(function handleViewportHover(viewport: ViewportType | null) {
        setCurrentlyHoveredViewport(viewport?.id ?? null);
    }, []);

    const handlePickingInfoChange = React.useCallback(
        function handlePickingInfoChange(newPickingInfoPerView: Record<string, PickingInfo[]>) {
            // Convert to unscaled coordinates at the time of picking
            // This ensures coordinates stay correct when verticalScale changes later
            const unscaled: Record<string, [number, number, number][]> = {};
            for (const [viewId, picks] of Object.entries(newPickingInfoPerView)) {
                unscaled[viewId] = picks
                    .map((pick) => pick.coordinate)
                    .filter((coord): coord is number[] => Array.isArray(coord) && coord.length === 3)
                    .map((coord): [number, number, number] => [coord[0], coord[1], coord[2] / props.verticalScale]);
            }
            setUnscaledCoordinatesPerView(unscaled);
        },
        [props.verticalScale],
    );

    return (
        <ReadoutWrapper
            {...props}
            views={adjustedViews}
            layers={adjustedLayers}
            overlayLayers={[crossHairLayer, polylineHoverMarkerLayer]}
            onViewerHover={handleViewerHover}
            onViewportHover={handleViewportHover}
            onPickingInfoChange={handlePickingInfoChange}
        />
    );
}

const HOVER_CROSSHAIR_LAYER_ID = "2d-hover-world-pos";

function useCrosshairLayer(
    boundingBox: BoundingBox2D | undefined,
    hoverService: HoverService,
    instanceId: string,
): CrosshairLayer {
    const { x, y } = useHoverValue(HoverTopic.WORLD_POS_UTM, hoverService, instanceId) ?? {};
    const xInRange = boundingBox && x && inRange(x, boundingBox[0], boundingBox[2]);
    const yInRange = boundingBox && y && inRange(y, boundingBox[1], boundingBox[3]);
    const color: [number, number, number] = [255, 255, 255];

    return new CrosshairLayer({
        id: HOVER_CROSSHAIR_LAYER_ID,
        worldCoordinates: [x ?? 0, y ?? 0, 0],
        sizePx: 40,
        // Hide the crosshair with opacity to keep layer mounted
        color: [...color, xInRange && yInRange ? 225 : 0],
    });
}

const POLYLINE_HOVER_MARKER_LAYER_ID = "polyline-hover-marker";

function usePolylineHoverMarkerLayer(
    polylinesPlugin: PolylinesPlugin,
    hoverService: HoverService,
    instanceId: string,
): ScatterplotLayer {
    const hovered = useHoverValue(HoverTopic.FENCE, hoverService, instanceId);
    const polylineEditingMode = usePublishSubscribeTopicValue(polylinesPlugin, PolylinesPluginTopic.EDITING_MODE);
    const availablePolylines = usePublishSubscribeTopicValue(polylinesPlugin, PolylinesPluginTopic.POLYLINES);

    let position: [number, number, number] | null = null;

    if (polylineEditingMode !== PolylineEditingMode.DISABLED && hovered) {
        const hoveredPolylineId = getPolylineIdFromFenceId(hovered.fenceId);

        const polyline = availablePolylines.find((p) => p.id === hoveredPolylineId);

        if (polyline) {
            // The fence payload will be the length along a XY line following the polyline. The polyline
            // might have 3D positions, so we need to convert to a length in 3D space.
            const polylineLengthAlong = convertFenceLengthAlongToPolylineLengthAlong(
                polyline.path,
                hovered.lengthAlong,
            );

            position = polylineLengthAlong ? positionAtLengthAlong(polyline.path, polylineLengthAlong) : null;
        }
    }

    return new ScatterplotLayer({
        id: POLYLINE_HOVER_MARKER_LAYER_ID,
        data: position ? [{ position: position }] : [],
        getPosition: (d: { position: [number, number, number] }) => d.position,
        radiusUnits: "meters",
        getRadius: 60,
        radiusMinPixels: 8,
        radiusMaxPixels: 20,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        getFillColor: [255, 0, 0, 180],
        stroked: true,
        pickable: false,
        billboard: true,
        parameters: {
            depthTest: false,
        },
    });
}

function usePickingRayLayers(
    unscaledCoordinatesPerView: Record<string, [number, number, number][]>,
    showRay: boolean = true,
): Record<string, PickingRayLayer> {
    const pickingRayLayers: Record<string, PickingRayLayer> = {};

    for (const [viewId, pickCoordinates] of Object.entries(unscaledCoordinatesPerView)) {
        pickingRayLayers[viewId] = new PickingRayLayer({
            id: `picking-ray-layer-${viewId}`,
            pickInfoCoordinates: pickCoordinates,
            origin: [0, 0, 0], // Not relevant when not showing a ray
            showRay,
            sizeUnits: "pixels",
            sphereRadius: 6,
        });
    }

    return pickingRayLayers;
}

function convertPolylineLengthAlongToFenceLengthAlong(
    polylinePath: number[][],
    polylineLengthAlong: number,
): number | null {
    // This is arguably a sub-optimal approach, but polyline paths are expected to only be a few segments,
    // so this should be fine for now...
    // Get the position for this point along the 3D-space poly-line
    const polylinePos = positionAtLengthAlong(polylinePath, polylineLengthAlong);

    if (!polylinePos) return null;

    // The fence only cares about XY positions, but otherwise matches the polyline.
    const fenceLengthAlongConverted = lengthAlongAtXyPosition(
        polylinePath.map((v) => [v[0], v[1]]),
        polylinePos[0],
        polylinePos[1],
    );

    return fenceLengthAlongConverted;
}

function convertFenceLengthAlongToPolylineLengthAlong(polylinePath: number[][], lengthAlong: number): number | null {
    // Get the position for this length-along in the XY-plane
    const fencePos = positionAtLengthAlong(
        polylinePath.map((v) => [v[0], v[1]]),
        lengthAlong,
    );

    if (!fencePos) {
        return null;
    }

    const polylineLengthAlong = lengthAlongAtXyPosition(polylinePath, fencePos[0], fencePos[1]);
    return polylineLengthAlong;
}
