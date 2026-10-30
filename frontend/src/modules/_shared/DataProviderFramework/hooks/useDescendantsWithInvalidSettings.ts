import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { DataProviderStatus, isDataProvider, type DataProvider } from "../framework/DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../framework/DataProviderManager/DataProviderManager";
import type { ItemGroup } from "../interfacesAndTypes/entities";

/**
 * Data providers among the descendants of the group which have invalid settings. Recomputed on every GUI state
 * revision, as provider status changes are published through it.
 */
export function useDescendantsWithInvalidSettings(group: ItemGroup): DataProvider<any, any>[] {
    const revisionNumber = usePublishSubscribeTopicValue(
        group.getItemDelegate().getDataProviderManager(),
        DataProviderManagerTopic.GUI_STATE_REVISION,
    );

    return React.useMemo(
        function findDescendantsWithInvalidSettings() {
            return group
                .getGroupDelegate()
                .getDescendantItems(
                    (item) => isDataProvider(item) && item.getStatus() === DataProviderStatus.INVALID_SETTINGS,
                ) as DataProvider<any, any>[];
        },
        // ! "revisionNumber" is included in the array to trigger recomputes
        // eslint-disable-next-line @eslint-react/exhaustive-deps
        [group, revisionNumber],
    );
}
