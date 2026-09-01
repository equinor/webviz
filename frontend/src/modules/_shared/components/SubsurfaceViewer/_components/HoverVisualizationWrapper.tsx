import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash-es";

import type { HoverService, HoverData } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue, usePublishHoverValues } from "@framework/HoverService";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { PickingRayLayer } from "@modules/_shared/customDeckGlLayers/PickingRayLayer";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import { getPolylineIdFromFenceId, makeFenceSourceIdForPolyLine } from "@modules/_shared/utils/fence";
import { lengthAlongAtXyPosition, positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";
import type { DeckGlInstanceManager } from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";
import { findFirstMatchingTransformation } from "@modules/_shared/utils/subsurfaceViewer/hoverTransformations";
import type {
    Polyline,
    PolylineHoverData,
    PolylinesPlugin,
} from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";
import { PolylineEditingMode, PolylinesPluginTopic } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";

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

    const publishHoverValues = usePublishHoverValues(ctx.hoverService, ctx.moduleInstanceId);

    // Polyline hover is handled separately since it originates from the polyline plugin
    // const publishHoveredPolylineLengthAlong = usePublishHoverValue(
    //     HoverTopic.POLYLINE_LENGTH_ALONG,
    //     ctx.hoverService,
    //     ctx.moduleInstanceId,
    // );

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

    // const publishHoveredFenceRef = React.useRef(publishHoveredFence);
    // publishHoveredFenceRef.current = publishHoveredFence;

    // const payload = makeFenceHoverPayloadFromPolylineHoverData(polylineData);

    //             publishHoveredFenceRef.current(payload, "polyline-plugin");
    React.useEffect(
        function subscribeToPolylineHover() {
            return props.polylinesPlugin
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PolylinesPluginTopic.POLYLINE_HOVER)(() => {
                const polylineData = props.polylinesPlugin.getPolylineHoverData();
                const payload = makeFenceHoverPayloadFromPolylineHoverData(polylineData);

                publishHoverValues({ [HoverTopic.FENCE]: payload }, "polyline-plugin");
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

    const handleViewportHover = React.useCallback(function handleViewportHover(viewport: ViewportType | null) {
        setCurrentlyHoveredViewport(viewport?.id ?? null);
    }, []);

    const handlePickingInfoChange = React.useCallback(
        function handlePickingInfoChange(
            newPickingInfoPerView: Record<string, PickingInfo[]>,
            activeViewport?: string,
        ) {
            const coordsPerView: Record<string, [number, number, number][]> = {};
            for (const [viewId, picks] of Object.entries(newPickingInfoPerView)) {
                coordsPerView[viewId] = picks
                    .map((pick) => pick.coordinate)
                    .filter((coord): coord is number[] => Array.isArray(coord) && coord.length === 3)
                    .map((coord): [number, number, number] => [coord[0], coord[1], coord[2]]);
            }
            setUnscaledCoordinatesPerView(coordsPerView);

            let allPickingInfo: PickingInfo[];

            // Ensure picks in the hovered viewport is prioritized
            if (activeViewport) {
                const { [activeViewport]: hoveredPicks, ...otherPicks } = newPickingInfoPerView;
                allPickingInfo = [...hoveredPicks, ...Object.values(otherPicks).flat()];
            } else {
                allPickingInfo = Object.values(newPickingInfoPerView).flat();
            }

            const hoverData = allPickingInfo.reduce<Partial<HoverData>>((acc, info) => {
                if (!info.layer) return acc;

                const transformationFunc = findFirstMatchingTransformation(
                    ctx.hoverDataTransformationLookup,
                    Object.getPrototypeOf(info.layer).constructor,
                );

                if (!transformationFunc) {
                    return acc;
                }

                const hoverData = transformationFunc(info);

                // ! Acc should override here to ensure that the first (aka, directly hovered and then closest) hovered data is being used
                return { ...hoverData, ...acc };
            }, {});

            publishHoverValues(hoverData);
        },
        [ctx.hoverDataTransformationLookup, publishHoverValues],
    );

    return (
        <ReadoutWrapper
            {...props}
            views={adjustedViews}
            layers={adjustedLayers}
            overlayLayers={[crossHairLayer, polylineHoverMarkerLayer]}
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
        position = getPolylinePositionFromFenceLenghtAlong(hovered, availablePolylines);
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

function makeFenceHoverPayloadFromPolylineHoverData(
    polylineHoverData: PolylineHoverData | null,
): HoverData[HoverTopic.FENCE] | null {
    if (!polylineHoverData) return null;
    // Iterating the path multiple-times is arguably a sub-optimal approach, but polyline
    // paths are expected to only be a few segments, so this should be fine for now...
    const polylineFenceId = makeFenceSourceIdForPolyLine(polylineHoverData.polylineId);
    const polylinePath = polylineHoverData.path;
    const polylineLengthAlong = polylineHoverData.lengthAlong;

    // Get the position for this point along the 3D-space poly-line
    const polylinePos = positionAtLengthAlong(polylinePath, polylineLengthAlong);

    if (!polylinePos) return null;

    // The fence only cares about XY positions, but otherwise matches the polyline.
    const fenceLengthAlongConverted = lengthAlongAtXyPosition(
        polylinePath.map((v) => [v[0], v[1]]),
        polylinePos[0],
        polylinePos[1],
    );

    return {
        fenceId: polylineFenceId,
        lengthAlong: fenceLengthAlongConverted,
        // The hovered position's z-coordinate is a
        depth: -polylinePos[2],
    };
}

function getPolylinePositionFromFenceLenghtAlong(
    fenceHoverData: HoverData[HoverTopic.FENCE],
    availablePolylines: Polyline[],
) {
    if (!fenceHoverData) return null;

    const hoveredFenceId = getPolylineIdFromFenceId(fenceHoverData.fenceId);
    const hoveredPolyline = availablePolylines.find((p) => p.id === hoveredFenceId);

    if (!hoveredPolyline) {
        return null;
    }

    // Get the position for this length-along in the XY-plane
    const fencePos = positionAtLengthAlong(
        hoveredPolyline.path.map((v) => [v[0], v[1]]),
        fenceHoverData.lengthAlong,
    )!;

    if (!fencePos) {
        // This case should technically never occur, since hover triggering implies a valid fence pos
        console.warn("Unable to find position on polyline");
        return null;
    }

    const [hoverX, hoverY] = fencePos;
    const polylineLengthAlong = lengthAlongAtXyPosition(hoveredPolyline.path, hoverX, hoverY);

    return positionAtLengthAlong(hoveredPolyline.path, polylineLengthAlong);
}
