import React from "react";

import {
    DataProviderManagerTopic,
    type DataProviderManager,
} from "../framework/DataProviderManager/DataProviderManager";
import type {
    AssemblerProduct,
    CustomGroupPropsMap,
    VisualizationAssembler,
    VisualizationAssemblerMakeOptions,
    VisualizationTarget,
} from "../visualization/VisualizationAssembler";

export function useVisualizationAssemblerProduct<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap,
    TAccumulatedData extends Record<string, any>,
    TInjectedData extends Record<string, any>,
>(
    dataProviderManager: DataProviderManager,
    visualizationAssembler: VisualizationAssembler<TTarget, TCustomGroupProps, TInjectedData, TAccumulatedData>,
    // Ensure the "options" object is memoized to prevent unnecessary recomputations. This is especially important if the "options" object contains non-primitive values,
    // such as objects or arrays, which would be considered different on every render if not memoized.
    options?: VisualizationAssemblerMakeOptions<TInjectedData, TAccumulatedData>,
): AssemblerProduct<TTarget, TCustomGroupProps, TAccumulatedData> {
    const latestRevision = React.useSyncExternalStore(
        dataProviderManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION),
        dataProviderManager.makeSnapshotGetter(DataProviderManagerTopic.DATA_REVISION),
    );
    // Data revisions are held back while restoring a state - without this, the product made before would not tell
    // that it is outdated
    const isDeserializing = React.useSyncExternalStore(
        dataProviderManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(DataProviderManagerTopic.IS_DESERIALIZING),
        dataProviderManager.makeSnapshotGetter(DataProviderManagerTopic.IS_DESERIALIZING),
    );

    const memoizedProduct = React.useMemo(
        function memoizeVisualizationProduct() {
            return visualizationAssembler.make(dataProviderManager, options);
        },
        // ! "latestRevision" and "isDeserializing" are included in the array to trigger recomputes
        // eslint-disable-next-line @eslint-react/exhaustive-deps
        [latestRevision, isDeserializing, dataProviderManager, visualizationAssembler, options],
    );

    return memoizedProduct;
}
