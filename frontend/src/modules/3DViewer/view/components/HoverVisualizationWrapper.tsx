import React from "react";

import { cloneDeep } from "lodash";

import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ReadoutWrapper, type ReadoutWrapperProps } from "./ReadoutWrapper";

export type HoverVisualizationWrapperProps = ReadoutWrapperProps;

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const hoverVisualizations = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        props.assemblerProduct,
        props.workbenchServices,
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

    return (
        <ReadoutWrapper
            {...props}
            views={{
                ...props.views,
                viewports: adjustedViewportsWithHoverVisualizations,
            }}
            layers={adjustedLayersWithHoverVisualizations}
        />
    );
}
