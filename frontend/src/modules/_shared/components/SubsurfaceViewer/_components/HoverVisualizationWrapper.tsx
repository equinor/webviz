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
import type { DeckGlInstanceManager } from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";
import { getHoverDataInPicks } from "@modules/_shared/utils/subsurfaceViewerLayers";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { ReadoutWrapper } from "./ReadoutWrapper";

/**
 * Stable pub/sub store for the polyline hover marker position.
 * Passed as a prop from InteractionWrapper; HoverVisualizationWrapper subscribes via useSyncExternalStore
 * so only it re-renders on position changes (not the whole InteractionWrapper subtree).
 */
export class PolylineMarkerStore {
    private _position: [number, number, number] | null = null;
    private _listeners = new Set<() => void>();

    setPosition(position: [number, number, number] | null): void {
        this._position = position;
        for (const listener of this._listeners) listener();
    }

    getPosition(): [number, number, number] | null {
        return this._position;
    }

    subscribe(callback: () => void): () => void {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }
}

export type HoverVisualizationWrapperProps = {
    views: ViewsTypeExtended;
    layers: DeckGlLayer[];
    deckGlManager: DeckGlInstanceManager;
    verticalScale: number;
    triggerHome: number;
    deckGlRef: React.RefObject<DeckGLRef | null>;
    polylineMarkerStore?: PolylineMarkerStore;
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

    const crossHairLayer = useCrosshairLayer(ctx.bounds, ctx.hoverService, ctx.moduleInstanceId);
    const polylineHoverMarkerLayer = usePolylineHoverMarkerLayer(props.polylineMarkerStore);

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
        },
        [publishHoveredMd, publishHoveredWellbore, publishHoveredWorldPos],
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

function usePolylineHoverMarkerLayer(markerStore: PolylineMarkerStore | undefined): ScatterplotLayer {
    const position = React.useSyncExternalStore(
        (callback) => markerStore?.subscribe(callback) ?? (() => {}),
        () => markerStore?.getPosition() ?? null,
    );

    return new ScatterplotLayer({
        id: POLYLINE_HOVER_MARKER_LAYER_ID,
        data: position ? [{ position: position }] : [],
        getPosition: (d: { position: [number, number, number] }) => d.position,
        getRadius: 8,
        radiusUnits: "pixels",
        radiusMinPixels: 8,
        radiusMaxPixels: 8,
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
