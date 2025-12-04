import React from "react";

import type { SettingsContext, ViewContext } from "@framework/ModuleContext";
import { useRefStableSyncSettingsHelper, type SyncSettingKey } from "@framework/SyncSettings";
import type { GlobalTopicDefinitions, TopicDefinitionsType, WorkbenchServices } from "@framework/WorkbenchServices";

export type UseSyncSettingOptions<K extends keyof GlobalTopicDefinitions> = {
    workbenchServices: WorkbenchServices;
    moduleContext: SettingsContext<any> | ViewContext<any>;
    syncSettingKey: SyncSettingKey;
    topic: K;
    value: GlobalTopicDefinitions[K] | null;
    setValue: (value: GlobalTopicDefinitions[K]) => void;
};

export function useSyncSetting<T extends keyof GlobalTopicDefinitions>(options: UseSyncSettingOptions<T>): void {
    const { setValue } = options;
    const [prevSyncedValue, setPrevSyncedValue] = React.useState<GlobalTopicDefinitions[T] | null>(null);

    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: options.workbenchServices,
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
                    options.value as TopicDefinitionsType<T>,
                );
            }
        },
        [options.value, options.syncSettingKey, options.topic, syncHelper],
    );
}
