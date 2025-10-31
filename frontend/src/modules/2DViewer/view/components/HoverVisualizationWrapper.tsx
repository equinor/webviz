import React from "react";

import type { BoundingBox2D, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue } from "@framework/HoverService";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type {
    AssemblerProduct,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { SubsurfaceViewerWrapperProps } from "./SubsurfaceViewerWrapper";
import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

export type HoverVisualizationWrapperProps = {
    assemblerProduct: AssemblerProduct<VisualizationTarget.DECK_GL>;
    hoverService: HoverService;
} & SubsurfaceViewerWrapperProps;

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

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const { views, layers, onViewportHover, ...otherProps } = props;

    const [currentlyHoveredViewport, setCurrentlyHoveredViewport] = React.useState<null | string>(null);

    const crossHairLayer = useCrosshairLayer(props.bounds, props.hoverService, props.instanceId);

    const hoverVisualizations = useSubscribedProviderHoverVisualizations(
        props.assemblerProduct,
        props.hoverService,
        props.instanceId,
    );

    const [adjustedLayers, adjustedViews] = React.useMemo(() => {
        const adjustedLayers = [...layers];

        const adjustedViewports = views.viewports.map((viewport) => {
            const adjustedViewportLayerIds = viewport.layerIds ?? [];
            if (viewport.id !== currentlyHoveredViewport) {
                adjustedViewportLayerIds.push(HOVER_CROSSHAIR_LAYER_ID);
            }

            for (const hoverVisualization of hoverVisualizations) {
                if (hoverVisualization.groupId !== viewport.id) continue;

                for (const layer of hoverVisualization.hoverVisualizations) {
                    if (!adjustedLayers.some(({ id }) => layer.id === id)) adjustedLayers.push(layer);
                    if (!adjustedViewportLayerIds.includes(layer.id)) adjustedViewportLayerIds.push(layer.id);
                }
            }

            return {
                ...viewport,
                layerIds: adjustedViewportLayerIds,
            };
        });

        return [adjustedLayers, { ...views, viewports: adjustedViewports }] as const;
    }, [currentlyHoveredViewport, hoverVisualizations, layers, views]);

    const handleViewportHover = React.useCallback(
        function handleViewportHover(viewport: ViewportType | null) {
            setCurrentlyHoveredViewport(viewport?.id ?? null);
            onViewportHover?.(viewport);
        },
        [onViewportHover],
    );

    return (
        <SubsurfaceViewerWrapper
            views={adjustedViews}
            layers={[...adjustedLayers, crossHairLayer]}
            onViewportHover={handleViewportHover}
            {...otherProps}
        />
    );
}
