import React from "react";

import type { SettingsContext, ViewContext } from "@framework/ModuleContext";
import { useRefStableSyncSettingsHelper, type SyncSettingKey } from "@framework/SyncSettings";
import type {
    SyncSettingsService,
    SyncSettingsTopicDefinitions,
    SyncSettingsTopicValueType,
} from "@framework/SyncSettingsService";

export type UseSyncSettingOptions<K extends keyof SyncSettingsTopicDefinitions> = {
    syncSettingsService: SyncSettingsService;
    moduleContext: SettingsContext<any> | ViewContext<any>;
    syncSettingKey: SyncSettingKey;
    topic: K;
    value: SyncSettingsTopicDefinitions[K] | null;
    setValue: (value: SyncSettingsTopicDefinitions[K]) => void;
};

export function useSyncSetting<T extends keyof SyncSettingsTopicDefinitions>(options: UseSyncSettingOptions<T>): void {
    const { setValue } = options;
    const [prevSyncedValue, setPrevSyncedValue] = React.useState<SyncSettingsTopicDefinitions[T] | null>(null);

    const syncHelper = useRefStableSyncSettingsHelper({
        syncSettingsService: options.syncSettingsService,
        moduleContext: options.moduleContext,
    });

    const syncedValue = syncHelper.useValue(options.syncSettingKey, options.topic);

    React.useEffect(
        function syncValue() {
            if (syncedValue !== null && syncedValue !== prevSyncedValue) {
                setValue(syncedValue);
                setPrevSyncedValue(syncedValue);
            }
        },
        [syncedValue, prevSyncedValue, setValue],
    );

    React.useEffect(
        function publishValue() {
            if (options.value !== null) {
                syncHelper.publishValue(
                    options.syncSettingKey,
                    options.topic,
                    options.value as SyncSettingsTopicValueType<T>,
                );
            }
        },
        [options.value, options.syncSettingKey, options.topic, syncHelper],
    );
}
