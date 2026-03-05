import React from "react";

import type { Layer as DeckGlLayer, PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import { PickingRayLayer } from "@modules/_shared/customDeckGlLayers/PickingRayLayer";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import { positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";
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
    polylinesPlugin?: PolylinesPlugin;
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
    const publishHoveredPolylineLengthAlong = usePublishHoverValue(
        HoverTopic.POLYLINE_LENGTH_ALONG,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const crossHairLayer = useCrosshairLayer(ctx.bounds, ctx.hoverService, ctx.moduleInstanceId);
    const polylineHoverMarkerLayer = usePolylineHoverMarkerLayer(
        props.polylinesPlugin,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const pickingRayLayers = usePickingRayLayers(unscaledCoordinatesPerView, false);

    const hoverVisualizationGroups = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        ctx.visualizationAssemblerProduct,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const adjustedLayers = [...props.layers, crossHairLayer, polylineHoverMarkerLayer];
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
            );

            publishHoveredWorldPos(hoverData[HoverTopic.WORLD_POS_UTM]);
            publishHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
            publishHoveredMd(hoverData[HoverTopic.WELLBORE_MD]);
            publishHoveredPolylineLengthAlong(props.polylinesPlugin?.getPolylineHoverData() ?? null);
        },
        [
            publishHoveredMd,
            publishHoveredWellbore,
            publishHoveredWorldPos,
            publishHoveredPolylineLengthAlong,
            props.polylinesPlugin,
        ],
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
    polylinesPlugin: PolylinesPlugin | undefined,
    hoverService: HoverService,
    instanceId: string,
): ScatterplotLayer {
    const hoverData = useHoverValue(HoverTopic.POLYLINE_LENGTH_ALONG, hoverService, instanceId);

    const editingMode = React.useSyncExternalStore(
        (callback) =>
            polylinesPlugin
                ? polylinesPlugin
                      .getPublishSubscribeDelegate()
                      .makeSubscriberFunction(PolylinesPluginTopic.EDITING_MODE)(callback)
                : () => {},
        () => polylinesPlugin?.makeSnapshotGetter(PolylinesPluginTopic.EDITING_MODE)() ?? PolylineEditingMode.NONE,
    );

    const polylines = React.useSyncExternalStore(
        (callback) =>
            polylinesPlugin
                ? polylinesPlugin.getPublishSubscribeDelegate().makeSubscriberFunction(PolylinesPluginTopic.POLYLINES)(
                      callback,
                  )
                : () => {},
        () => polylinesPlugin?.makeSnapshotGetter(PolylinesPluginTopic.POLYLINES)() ?? [],
    );

    const markerPosition = React.useMemo(() => {
        if (!polylinesPlugin || editingMode === PolylineEditingMode.NONE || !hoverData) return null;
        const polyline = polylines.find((p) => p.id === hoverData.polylineId);
        if (!polyline) return null;
        return positionAtLengthAlong(polyline.path, hoverData.lengthAlong);
    }, [polylinesPlugin, editingMode, polylines, hoverData]);

    return new ScatterplotLayer({
        id: POLYLINE_HOVER_MARKER_LAYER_ID,
        data: markerPosition
            ? [{ position: [markerPosition[0], markerPosition[1], 0] as [number, number, number] }]
            : [],
        getPosition: (d: { position: [number, number, number] }) => d.position,
        getRadius: 8,
        radiusUnits: "pixels",
        getFillColor: [255, 0, 0, 180],
        stroked: true,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        getLineColor: [255, 255, 255, 255],
        pickable: false,
        billboard: true,
        parameters: { depthTest: false },
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
