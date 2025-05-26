import React from "react";

import type { WorkbenchServices } from "@framework/WorkbenchServices";

import {
    VisualizationItemType,
    type AssemblerProduct,
    type DataProviderHoverVisualizationTargetTypes,
    type HoverTopicDefinitions,
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
    hoverVisualizations: Partial<
        Record<keyof HoverTopicDefinitions, DataProviderHoverVisualizationTargetTypes[TTarget][]>
    >;
};

type InternalAssemblerProviderHoverVisualizationFunctions<TTarget extends VisualizationTarget> = {
    groupId?: string;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
};

export function useSubscribedProviderHoverVisualizations<TTarget extends VisualizationTarget>(
    visualizationAssemblerProduct: AssemblerProduct<TTarget, any, any>,
    workbenchServices: WorkbenchServices,
): AssemblerProviderHoverVisualizations<TTarget>[] {
    const [visualizations, setVisualizations] = React.useState<InternalAssemblerProviderHoverVisualizations<TTarget>[]>(
        [],
    );

    React.useEffect(
        function subscribeToWorkbenchServices() {
            const hoverVisualizationFunctions =
                flattenVisualizationFunctionsRecursively<TTarget>(visualizationAssemblerProduct);
            const unsubscribeFunctions: (() => void)[] = [];

            let visualizationsArray: InternalAssemblerProviderHoverVisualizations<TTarget>[] =
                hoverVisualizationFunctions.map((hoverVisualizationFunction) => ({
                    groupId: hoverVisualizationFunction.groupId,
                    hoverVisualizations: {},
                }));
            setVisualizations(visualizationsArray);

            for (const hoverVisualizationFunction of hoverVisualizationFunctions) {
                for (const [topic, hoverFunction] of Object.entries(
                    hoverVisualizationFunction.hoverVisualizationFunctions,
                )) {
                    const typedKey = topic as keyof HoverTopicDefinitions;
                    unsubscribeFunctions.push(
                        workbenchServices.subscribe(typedKey, (value) => {
                            const newVisualizations = [...visualizationsArray];

                            if (value === null) {
                                // If the value is null, we clear the visualizations for this group
                                for (const visualization of newVisualizations) {
                                    if (visualization.groupId === hoverVisualizationFunction.groupId) {
                                        visualization.hoverVisualizations[typedKey] = [];
                                    }
                                }
                            } else {
                                for (const visualization of newVisualizations) {
                                    if (visualization.groupId === hoverVisualizationFunction.groupId) {
                                        visualization.hoverVisualizations[typedKey] = hoverFunction(value as any);
                                    }
                                }
                            }
                            visualizationsArray = newVisualizations;
                            setVisualizations(newVisualizations);
                        }),
                    );
                }
            }

            return function unsubscribeFromWorkbenchServices() {
                for (const unsubscribeFunction of unsubscribeFunctions) {
                    unsubscribeFunction();
                }
                setVisualizations([]);
            };
        },
        [visualizationAssemblerProduct, workbenchServices],
    );

    return visualizations.map((visualization) => ({
        groupId: visualization.groupId,
        hoverVisualizations: Object.values(visualization.hoverVisualizations).flat(),
    }));
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
