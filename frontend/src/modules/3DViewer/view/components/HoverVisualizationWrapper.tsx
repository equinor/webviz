import React from "react";

import type { MapMouseEvent } from "@webviz/subsurface-viewer";
import { cloneDeep } from "lodash";

import { HoverTopic, usePublishHoverValue } from "@framework/HoverService";
import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { getHoverTopicValuesInEvent } from "@modules/_shared/utils/subsurfaceViewerLayers";

import { ReadoutWrapper, type ReadoutWrapperProps } from "./ReadoutWrapper";

export type HoverVisualizationWrapperProps = ReadoutWrapperProps;

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const { onViewerHover } = props;

    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS, props.hoverService, props.moduleInstanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, props.hoverService, props.moduleInstanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.WELLBORE_MD, props.hoverService, props.moduleInstanceId);

    const hoverVisualizations = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        props.assemblerProduct,
        props.hoverService,
        props.moduleInstanceId,
    );

    const adjustedLayersWithHoverVisualizations = [...(props.layers ?? [])];
    const adjustedViewportsWithHoverVisualizations = cloneDeep(props.views?.viewports ?? []);

    for (const hoverVisualization of hoverVisualizations) {
        for (const viewport of adjustedViewportsWithHoverVisualizations) {
            if (hoverVisualization.groupId === viewport.id) {
                viewport.layerIds = [
                    ...(viewport.layerIds ?? []),
                    ...hoverVisualization.hoverVisualizations.map((v) => v.id),
                ];
                adjustedLayersWithHoverVisualizations.push(...hoverVisualization.hoverVisualizations);
            }
        }
    }

    const handleViewerHover = React.useCallback(
        function handleViewerHover(mouseEvent: MapMouseEvent) {
            const hoverData = getHoverTopicValuesInEvent(
                mouseEvent,
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

    return (
        <ReadoutWrapper
            {...props}
            views={{
                ...props.views,
                viewports: adjustedViewportsWithHoverVisualizations,
            }}
            onViewerHover={handleViewerHover}
            layers={adjustedLayersWithHoverVisualizations}
        />
    );
}
