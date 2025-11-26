import type React from "react";

import { useSubscribedProviderHoverVisualizations } from "@modules/_shared/DataProviderFramework/visualization/hooks/useSubscribedProviderHoverVisualizations";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { cloneDeep } from "lodash";

import { useDpfSubsurfaceViewerContext } from "./DataProvidersWrapper";
import { ReadoutWrapper, type ReadoutWrapperProps } from "./ReadoutWrapper";

export type HoverVisualizationWrapperProps = ReadoutWrapperProps;

export function HoverVisualizationWrapper(props: HoverVisualizationWrapperProps): React.ReactNode {
    const context = useDpfSubsurfaceViewerContext();
    const hoverVisualizations = useSubscribedProviderHoverVisualizations<VisualizationTarget.DECK_GL>(
        context.visualizationAssemblerProduct,
        context.workbenchServices,
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
