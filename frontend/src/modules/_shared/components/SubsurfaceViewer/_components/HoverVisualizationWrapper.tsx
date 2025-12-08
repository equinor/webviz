import React from "react";

import type { BoundingBox2D, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { cloneDeep, inRange } from "lodash";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { getHoverDataInPicks } from "@modules/_shared/utils/subsurfaceViewerLayers";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

import { ReadoutWrapper, type ReadoutWrapperProps } from "./ReadoutWrapper";

export type HoverVisualizationWrapperProps = ReadoutWrapperProps;

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const { onViewerHover, onViewportHover } = props;

    const ctx = useDpfSubsurfaceViewerContext();

    const crossHairLayer = useCrosshairLayer(ctx.bounds, ctx.hoverService, ctx.moduleInstanceId);

    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS, ctx.hoverService, ctx.moduleInstanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, ctx.hoverService, ctx.moduleInstanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.WELLBORE_MD, ctx.hoverService, ctx.moduleInstanceId);

    const [currentlyHoveredViewport, setCurrentlyHoveredViewport] = React.useState<null | string>(null);

    const hoverVisualizations = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        ctx.visualizationAssemblerProduct,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const adjustedLayersWithHoverVisualizations = [...(props.layers ?? [])];
    const adjustedViewportsWithHoverVisualizations = cloneDeep(props.views?.viewports ?? []);
    const globalVisualizations = hoverVisualizations.find(({ groupId }) => groupId === "")?.hoverVisualizations ?? [];

    for (const hoverVisualization of hoverVisualizations) {
        for (const viewport of adjustedViewportsWithHoverVisualizations) {
            if (hoverVisualization.groupId === viewport.id) {
                const hoverLayers = [...hoverVisualization.hoverVisualizations, ...globalVisualizations];
                const hoverLayerIds = hoverLayers.map((layer) => layer.id);

                viewport.layerIds = viewport.layerIds?.concat(...hoverLayerIds);
                adjustedLayersWithHoverVisualizations.push(...hoverLayers);
            }
            if (viewport.id !== currentlyHoveredViewport && ctx.visualizationMode === "2D") {
                viewport.layerIds?.push(HOVER_CROSSHAIR_LAYER_ID);
            }
        }
    }

    adjustedLayersWithHoverVisualizations.push(crossHairLayer);

    const handleViewerHover = React.useCallback(
        function handleViewerHover(mouseEvent: MapMouseEvent) {
            const hoverData = getHoverDataInPicks(
                mouseEvent.infos,
                HoverTopic.WELLBORE_MD,
                HoverTopic.WELLBORE,
                HoverTopic.WORLD_POS,
            );

            setHoveredWorldPos(hoverData[HoverTopic.WORLD_POS]);
            setHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
            setHoveredMd(hoverData[HoverTopic.WELLBORE_MD]);

            onViewerHover?.(mouseEvent);
        },
        [onViewerHover, setHoveredMd, setHoveredWellbore, setHoveredWorldPos],
    );

    const handleViewportHover = React.useCallback(
        function handleViewportHover(viewport: ViewportType | null) {
            setCurrentlyHoveredViewport(viewport?.id ?? null);
            onViewportHover?.(viewport);
        },
        [onViewportHover],
    );

    return (
        <ReadoutWrapper
            {...props}
            views={{
                ...props.views,
                viewports: adjustedViewportsWithHoverVisualizations,
            }}
            onViewerHover={handleViewerHover}
            onViewportHover={handleViewportHover}
            layers={adjustedLayersWithHoverVisualizations}
        />
    );
}

const HOVER_CROSSHAIR_LAYER_ID = "2d-hover-world-pos";

function useCrosshairLayer(
    boundingBox: BoundingBox2D | undefined,
    hoverService: HoverService,
    instanceId: string,
): CrosshairLayer {
    const { x, y } = useHoverValue(HoverTopic.WORLD_POS, hoverService, instanceId) ?? {};
    const xInRange = boundingBox && x && inRange(x, boundingBox[0], boundingBox[2]);
    const yInRange = boundingBox && y && inRange(y, boundingBox[1], boundingBox[3]);

    return new CrosshairLayer({
        id: HOVER_CROSSHAIR_LAYER_ID,
        worldCoordinates: [x ?? 0, y ?? 0, 0],
        sizePx: 40,
        // Hide it crosshair with opacity to keep layer mounted
        color: [255, 255, 255, xInRange && yInRange ? 225 : 0],
    });
}
