import React from "react";

import {
    DataProviderManagerTopic,
    type DataProviderManager,
} from "../framework/DataProviderManager/DataProviderManager";
import type {
    AssemblerProduct,
    CustomGroupPropsMap,
    VisualizationAssembler,
    VisualizationTarget,
} from "../visualization/VisualizationAssembler";

export function useVisualizationAssemblerProduct<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap,
    TAccumulatedData extends Record<string, any>,
>(
    dataProviderManager: DataProviderManager,
    visualizationAssembler: VisualizationAssembler<TTarget, TCustomGroupProps, TAccumulatedData>,
): AssemblerProduct<TTarget, TCustomGroupProps, TAccumulatedData> {
    const latestRevision = React.useSyncExternalStore(
        dataProviderManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION),
        dataProviderManager.makeSnapshotGetter(DataProviderManagerTopic.DATA_REVISION),
    );

    const productMemoized = React.useMemo(() => {
        return visualizationAssembler.make(dataProviderManager);

        // ! "latestRevision" is included in the array to trigger recomputes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestRevision, dataProviderManager, visualizationAssembler]);

    return productMemoized;
}
