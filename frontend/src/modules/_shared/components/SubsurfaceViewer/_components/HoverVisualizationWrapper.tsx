import React from "react";

import type { BoundingBox2D, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash";

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

    const [currentlyHoveredViewport, setCurrentlyHoveredViewport] = React.useState<null | string>(null);

    const ctx = useDpfSubsurfaceViewerContext();
    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS_UTM, ctx.hoverService, ctx.moduleInstanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, ctx.hoverService, ctx.moduleInstanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.WELLBORE_MD, ctx.hoverService, ctx.moduleInstanceId);

    const crossHairLayer = useCrosshairLayer(ctx.bounds, ctx.hoverService, ctx.moduleInstanceId);

    const hoverVisualizationGroups = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        ctx.visualizationAssemblerProduct,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );

    const adjustedLayers = [...props.layers, crossHairLayer];
    const adjustedViews = {
        ...props.views,
        viewports: props.views.viewports.map((viewport) => {
            const viewportLayerIds = viewport.layerIds ? [...viewport.layerIds] : [];

            for (const hoverVisualizationGroup of hoverVisualizationGroups) {
                if (hoverVisualizationGroup.groupId !== viewport.id) continue;

                for (const layer of hoverVisualizationGroup.hoverVisualizations) {
                    if (!adjustedLayers.some(({ id }) => layer.id === id)) adjustedLayers.push(layer);
                    if (!viewportLayerIds.includes(layer.id)) viewportLayerIds.push(layer.id);
                }
            }

            if (viewport.id !== currentlyHoveredViewport) {
                viewportLayerIds.push(HOVER_CROSSHAIR_LAYER_ID);
            }

            return {
                ...viewport,
                layerIds: viewportLayerIds,
            };
        }),
    };

    const handleViewerHover = React.useCallback(
        function handleViewerHover(mouseEvent: MapMouseEvent) {
            const hoverData = getHoverDataInPicks(
                mouseEvent.infos,
                HoverTopic.WELLBORE_MD,
                HoverTopic.WELLBORE,
                HoverTopic.WORLD_POS_UTM,
            );

            setHoveredWorldPos(hoverData[HoverTopic.WORLD_POS_UTM]);
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
            views={adjustedViews}
            layers={adjustedLayers}
            onViewerHover={handleViewerHover}
            onViewportHover={handleViewportHover}
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

    return new CrosshairLayer({
        id: HOVER_CROSSHAIR_LAYER_ID,
        worldCoordinates: [x ?? 0, y ?? 0, 0],
        sizePx: 40,
        // Hide the crosshair with opacity to keep layer mounted
        color: [255, 255, 255, xInRange && yInRange ? 225 : 0],
    });
}
