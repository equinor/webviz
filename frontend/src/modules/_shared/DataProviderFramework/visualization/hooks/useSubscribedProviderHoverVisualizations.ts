import React from "react";

import type { HoverData, HoverService } from "@framework/HoverService";
import { HoverTopic } from "@framework/HoverService";

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
            const hoverFunctions = visualizationFunc.hoverVisualizationFunctions;
            const groupVisualization = [];

            for (const untypedTopic in hoverFunctions) {
                const { topic, topicVisualization } = getTypedTopicAndFunc(untypedTopic, hoverFunctions);

                if (topic && topicVisualization) {
                    const visualization = topicVisualization(hoverData[topic] ?? null);
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

function getTypedTopicAndFunc<TTarget extends VisualizationTarget>(
    untypedTopic: string,
    functions: HoverVisualizationFunctions<TTarget>,
) {
    if (!Object.values<string>(HoverTopic).includes(untypedTopic)) return {};

    const typedTopic = untypedTopic as HoverTopic;
    type TFunc = HoverVisualizationFunction<TTarget, typeof typedTopic>;
    const typedFunc = functions[typedTopic] as TFunc | undefined;

    return {
        topic: typedTopic,
        topicVisualization: typedFunc,
    };
}

function flattenVisualizationFunctionsRecursively<TTarget extends VisualizationTarget>(
    visualizationGroup: VisualizationGroup<TTarget> | AssemblerProduct<TTarget, any, any>,
): InternalAssemblerProviderHoverVisualizationFunctions<TTarget>[] {
    const visualizationFunctions: InternalAssemblerProviderHoverVisualizationFunctions<TTarget>[] = [];
    const groupId = Object.hasOwn(visualizationGroup, "id")
        ? (visualizationGroup as VisualizationGroup<TTarget>).id
        : undefined;

    // The root group will have id as an empty string; We don't include the root
    // group, as all of it's visualizations will be inherited in it's children
    if (visualizationGroup.hoverVisualizationFunctions && groupId !== "") {
        visualizationFunctions.push({
            groupId,
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
