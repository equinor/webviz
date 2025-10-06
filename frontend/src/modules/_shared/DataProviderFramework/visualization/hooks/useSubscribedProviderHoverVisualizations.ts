import React from "react";

import type { HoverData, HoverService, HoverTopic } from "@framework/HoverService";

import {
    VisualizationItemType,
    type AssemblerProduct,
    type DataProviderHoverVisualizationTargetTypes,
    type HoverVisualizationFunction,
    type HoverVisualizationFunctions,
    type VisualizationGroup,
    type VisualizationTarget,
} from "../VisualizationAssembler";

export type AssemblerProviderHoverVisualizations<TTarget extends VisualizationTarget> = {
    groupId?: string;
    hoverVisualizations: DataProviderHoverVisualizationTargetTypes[TTarget][];
};

type InternalAssemblerProviderHoverVisualizations<TTarget extends VisualizationTarget> = {
    groupId?: string;
    hoverVisualizations: Partial<Record<HoverTopic, DataProviderHoverVisualizationTargetTypes[TTarget][]>>;
};

type InternalAssemblerProviderHoverVisualizationFunctions<TTarget extends VisualizationTarget> = {
    groupId?: string;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
};

export function useSubscribedProviderHoverVisualizations<TTarget extends VisualizationTarget>(
    visualizationAssemblerProduct: AssemblerProduct<TTarget, any, any>,
    hoverService: HoverService,
    moduleInstanceId: string,
): AssemblerProviderHoverVisualizations<TTarget>[] {
    const [hoverData, setHoverData] = React.useState<Partial<HoverData>>({});

    const visualizationFunctions = React.useMemo(
        () => flattenVisualizationFunctionsRecursively(visualizationAssemblerProduct),
        [visualizationAssemblerProduct],
    );

    React.useEffect(
        function subscribeToHoverTopics() {
            const unsubscribeFunctions: (() => void)[] = [];
            const topics = new Set(
                visualizationFunctions.flatMap((f) => {
                    return Object.keys(f.hoverVisualizationFunctions) as HoverTopic[];
                }),
            );

            for (const topic of topics) {
                const topicUnsubFunc = hoverService.getPublishSubscribeDelegate().subscribe(topic, () => {
                    const topicData = hoverService.getTopicValue(topic, moduleInstanceId);

                    setHoverData((prev) => {
                        if (prev[topic] === topicData) return prev;
                        return { ...prev, [topic]: topicData };
                    });
                });

                unsubscribeFunctions.push(topicUnsubFunc);
            }

            return function unsubscribeFromWorkbenchServices() {
                for (const unsubscribeFunction of unsubscribeFunctions) {
                    unsubscribeFunction();
                }
                setHoverData({});
            };
        },
        [hoverService, moduleInstanceId, visualizationAssemblerProduct, visualizationFunctions],
    );

    return React.useMemo(() => {
        const visualizations = [] as AssemblerProviderHoverVisualizations<TTarget>[];

        for (const visualizationFunc of visualizationFunctions) {
            const groupVisualization = [];

            for (const topic in visualizationFunc.hoverVisualizationFunctions) {
                const typedTopic = topic as HoverTopic;
                const topicVisualization = visualizationFunc.hoverVisualizationFunctions[typedTopic] as
                    | HoverVisualizationFunction<TTarget, typeof typedTopic>
                    | undefined;

                const data = hoverData[typedTopic];

                if (topicVisualization && data !== undefined) {
                    const visualization = topicVisualization(data);

                    groupVisualization.push(visualization);
                }
            }

            visualizations.push({
                groupId: visualizationFunc.groupId,
                hoverVisualizations: groupVisualization.flat(),
            });
        }
        return visualizations;
    }, [hoverData, visualizationFunctions]);
}

function flattenVisualizationFunctionsRecursively<TTarget extends VisualizationTarget>(
    visualizationGroup: VisualizationGroup<TTarget> | AssemblerProduct<TTarget, any, any>,
): InternalAssemblerProviderHoverVisualizationFunctions<TTarget>[] {
    const visualizationFunctions: InternalAssemblerProviderHoverVisualizationFunctions<TTarget>[] = [];
    if (visualizationGroup.hoverVisualizationFunctions) {
        visualizationFunctions.push({
            groupId: Object.hasOwn(visualizationGroup, "id")
                ? (visualizationGroup as VisualizationGroup<TTarget>).id
                : undefined,
            hoverVisualizationFunctions: visualizationGroup.hoverVisualizationFunctions,
        });
    }

    if (visualizationGroup.children) {
        for (const child of visualizationGroup.children) {
            if (child.itemType === VisualizationItemType.GROUP) {
                visualizationFunctions.push(...flattenVisualizationFunctionsRecursively<TTarget>(child));
            }
        }
    }

    return visualizationFunctions;
}
