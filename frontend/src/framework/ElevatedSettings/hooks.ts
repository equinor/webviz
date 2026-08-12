import React from "react";

import type { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";
import { ElevatedSettingInstanceTopic, type ElevatedSettingInstance } from "./ElevatedSettingInstance";
import { useElevatedSettingInstances, type ElevatedSettingsService } from "./ElevatedSettingsService";

export function useElevatedSetting<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): ElevatedSettingInstance<TValue, TConstraints> | undefined {
    const instances = useElevatedSettingInstances(elevatedSettingsService);

    return instances.get(definition.key) as ElevatedSettingInstance<TValue, TConstraints> | undefined;
}

export function useElevatedSettingValue<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): TValue | undefined {
    const instance = useElevatedSetting(elevatedSettingsService, definition);

    return React.useSyncExternalStore(
        React.useCallback(
            (callback) => {
                if (!instance) {
                    return () => {};
                }

                return instance
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(ElevatedSettingInstanceTopic.VALUE)(callback);
            },
            [instance],
        ),
        React.useCallback(() => instance?.getValue(), [instance]),
    );
}
