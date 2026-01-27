import React from "react";

import type { Layer as DeckGlLayer } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, MapMouseEvent, ViewportType } from "@webviz/subsurface-viewer";
import { CrosshairLayer } from "@webviz/subsurface-viewer/dist/layers";
import { inRange } from "lodash";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import type { DeckGlInstanceManager } from "@modules/_shared/utils/subsurfaceViewer/DeckGlInstanceManager";
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
    children?: React.ReactNode;
};

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const [isGoingToRemovePickedWorldPos, setIsGoingToRemovePickedWorldPos] = React.useState<boolean>(false);
    const [currentlyHoveredViewport, setCurrentlyHoveredViewport] = React.useState<null | string>(null);

    const ctx = useDpfSubsurfaceViewerContext();
    const publishHoveredWorldPos = usePublishHoverValue(
        HoverTopic.WORLD_POS_UTM,
        ctx.hoverService,
        ctx.moduleInstanceId,
    );
    const publishHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, ctx.hoverService, ctx.moduleInstanceId);
    const publishHoveredMd = usePublishHoverValue(HoverTopic.WELLBORE_MD, ctx.hoverService, ctx.moduleInstanceId);

    const crossHairLayer = useCrosshairLayer(
        ctx.bounds,
        ctx.hoverService,
        ctx.moduleInstanceId,
        isGoingToRemovePickedWorldPos,
    );

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

    const handleIsGoingToRemovePickedWorldPos = React.useCallback(function handleIsGoingToRemovePickedWorldPos(
        isRemoving: boolean,
    ) {
        setIsGoingToRemovePickedWorldPos(isRemoving);
    }, []);

    const handleViewportHover = React.useCallback(function handleViewportHover(viewport: ViewportType | null) {
        setCurrentlyHoveredViewport(viewport?.id ?? null);
    }, []);

    return (
        <ReadoutWrapper
            {...props}
            views={adjustedViews}
            layers={adjustedLayers}
            onViewerHover={handleViewerHover}
            onViewportHover={handleViewportHover}
            onIsGoingToRemovePickedWorldPos={handleIsGoingToRemovePickedWorldPos}
        />
    );
}

const HOVER_CROSSHAIR_LAYER_ID = "2d-hover-world-pos";

function useCrosshairLayer(
    boundingBox: BoundingBox2D | undefined,
    hoverService: HoverService,
    instanceId: string,
    markAsGonnaBeRemoved?: boolean,
): CrosshairLayer {
    const { x, y } = useHoverValue(HoverTopic.WORLD_POS_UTM, hoverService, instanceId) ?? {};
    const xInRange = boundingBox && x && inRange(x, boundingBox[0], boundingBox[2]);
    const yInRange = boundingBox && y && inRange(y, boundingBox[1], boundingBox[3]);
    const color: [number, number, number] = markAsGonnaBeRemoved ? [255, 0, 0] : [255, 255, 255];

    return new CrosshairLayer({
        id: HOVER_CROSSHAIR_LAYER_ID,
        worldCoordinates: [x ?? 0, y ?? 0, 0],
        sizePx: 40,
        // Hide the crosshair with opacity to keep layer mounted
        color: [...color, xInRange && yInRange ? 225 : 0],
    });
}
