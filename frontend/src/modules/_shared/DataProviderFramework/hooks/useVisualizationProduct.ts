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
    // | null {
    const latestRevision = React.useSyncExternalStore(
        dataProviderManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION),
        dataProviderManager.makeSnapshotGetter(DataProviderManagerTopic.DATA_REVISION),
    );

    const memoizedProduct = React.useMemo(
        function memoizeVisualizationProduct() {
            // if (dataProviderManager.isDeserializing()) {
            //     // During deserialization, the data provider manager's state is being restored, and it may not be in a consistent state to create the visualization product.
            //     // Returning null or a placeholder product here can prevent errors that would occur if we tried to create the product with an inconsistent data provider manager state.
            //     return null;
            // }

            return visualizationAssembler.make(dataProviderManager, options);
        },
        // ! "latestRevision" is included in the array to trigger recomputes
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [latestRevision, dataProviderManager, visualizationAssembler, options],
    );

    return memoizedProduct;
}
