import React from "react";

import type { WorkbenchServices } from "@framework/WorkbenchServices";

import type {
    DataProviderHoverVisualizationTargetTypes,
    HoverTopicDefinitions,
    HoverVisualizationFunctions as HoverVisualizationFunctions,
    VisualizationTarget,
} from "../VisualizationAssembler";

export function useSubscribedProviderHoverVisualizations<TTarget extends VisualizationTarget>(
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>,
    workbenchServices: WorkbenchServices,
): DataProviderHoverVisualizationTargetTypes[TTarget][] {
    const [visualizations, setVisualizations] = React.useState<DataProviderHoverVisualizationTargetTypes[TTarget][]>(
        [],
    );

    React.useEffect(
        function subscribeToWorkbenchServices() {
            const unsubscribers: (() => void)[] = [];

            const collectedVisualizations: Record<string, DataProviderHoverVisualizationTargetTypes[TTarget][]> = {};

            for (const key in hoverVisualizationFunctions) {
                const typedKey = key as keyof HoverTopicDefinitions;
                const fn = hoverVisualizationFunctions[typedKey];
                if (!fn) continue;

                const unsubscribe = workbenchServices.subscribe(typedKey, (value) => {
                    if (value === null) {
                        delete collectedVisualizations[typedKey];
                    } else {
                        collectedVisualizations[typedKey] = fn(value as any);
                    }

                    // Combine all visualizations into a single array
                    const flattened = Object.values(collectedVisualizations).flat();
                    setVisualizations(flattened);
                });

                unsubscribers.push(unsubscribe);
            }

            return function unsubscribeFromWorkbenchServices() {
                unsubscribers.forEach((unsub) => unsub());
            };
        },
        [hoverVisualizationFunctions, workbenchServices],
    );

    return visualizations;
}
