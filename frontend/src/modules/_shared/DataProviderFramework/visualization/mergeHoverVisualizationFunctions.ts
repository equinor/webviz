import type { HoverData, HoverTopic } from "@framework/HoverService";

import type { DataProviderHoverVisualizationTargetTypes, VisualizationTarget } from "./VisualizationAssembler";

export type HoverVisualizationFunction<TTarget extends VisualizationTarget, TTopic extends HoverTopic> = (
    hoverInfo: HoverData[TTopic],
) => DataProviderHoverVisualizationTargetTypes[TTarget][];

export type HoverVisualizationFunctions<TTarget extends VisualizationTarget> = {
    [K in HoverTopic]?: HoverVisualizationFunction<TTarget, K>;
};

// Combines the hover visualization functions of two sets - for a topic both have, the results of both are joined
export function mergeHoverVisualizationFunctions<TTarget extends VisualizationTarget>(
    base: HoverVisualizationFunctions<TTarget>,
    additional: HoverVisualizationFunctions<TTarget>,
): HoverVisualizationFunctions<TTarget> {
    const merged: HoverVisualizationFunctions<TTarget> = { ...base };

    for (const key in additional) {
        const typedKey = key as HoverTopic;
        const baseFn = base[typedKey];
        const additionalFn = additional[typedKey];

        if (baseFn && additionalFn) {
            // TypeScript can't narrow K per key in a dynamic loop; we assert here intentionally
            merged[typedKey] = ((hoverInfo: any) => [
                ...(baseFn as any)(hoverInfo),
                ...(additionalFn as any)(hoverInfo),
            ]) as any;
        } else if (additionalFn) {
            merged[typedKey] = additionalFn as any;
        }
    }

    return merged;
}
