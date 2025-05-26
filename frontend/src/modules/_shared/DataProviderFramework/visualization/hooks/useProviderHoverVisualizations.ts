import React from "react";

import type { WorkbenchServices } from "@framework/WorkbenchServices";

import type {
    DataProviderVisualizationTargetTypes,
    HoverTopicDefinitions,
    HoverVisualizationsFunctions,
    VisualizationTarget,
} from "../VisualizationAssembler";

export function useProviderHoverVisualizations<TTarget extends VisualizationTarget>(
    hoverVisualizationFunctions: HoverVisualizationsFunctions<TTarget>,
    workbenchServices: WorkbenchServices,
): DataProviderVisualizationTargetTypes[TTarget][] {
    const [visualizations, setVisualizations] = React.useState<DataProviderVisualizationTargetTypes[TTarget][]>([]);

    React.useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        const collectedVisualizations: Record<string, DataProviderVisualizationTargetTypes[TTarget][]> = {};

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

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [hoverVisualizationFunctions, workbenchServices]);

    return visualizations;
}
