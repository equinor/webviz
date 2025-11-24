import React from "react";

import type { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { GlobalTopicDefinitions, TopicDefinitionsType } from "@framework/WorkbenchServices";

export type UseSyncSettingOptions<K extends keyof GlobalTopicDefinitions> = {
    syncSettingsHelper: SyncSettingsHelper;
    syncSettingKey: SyncSettingKey;
    topic: K;
    value: GlobalTopicDefinitions[K] | null;
    setValue: (value: GlobalTopicDefinitions[K]) => void;
};

export function useSyncSetting<T extends keyof GlobalTopicDefinitions>(options: UseSyncSettingOptions<T>): void {
    const [prevSyncedValue, setPrevSyncedValue] = React.useState<GlobalTopicDefinitions[T] | null>(null);

    const syncedValue = options.syncSettingsHelper.useValue(options.syncSettingKey, options.topic);

    React.useEffect(
        function updateValue() {
            if (syncedValue !== null && syncedValue !== prevSyncedValue) {
                options.setValue(syncedValue);
                setPrevSyncedValue(syncedValue);
            }
        },
        [syncedValue, prevSyncedValue],
    );

    React.useEffect(
        function syncValue() {
            if (options.value !== null) {
                options.syncSettingsHelper.publishValue(
                    options.syncSettingKey,
                    options.topic,
                    options.value as TopicDefinitionsType<T>,
                );
            }
        },
        [options.value],
    );
}
