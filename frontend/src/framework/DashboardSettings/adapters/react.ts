import React from "react";

import { v4 } from "uuid";

import { useStableProp } from "@lib/hooks/useStableProp";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { DashboardSettingDefinition } from "../DashboardSettingDefinition";
import {
    DashboardSettingInstanceTopic,
    type DashboardSettingConstraintSourceHandle,
    type DashboardSettingInstance,
    type DashboardSettingInstanceTopicPayloads,
} from "../DashboardSettingInstance";
import { DashboardSettingsServiceTopic, type DashboardSettingsService } from "../DashboardSettingsService";

const NO_SUBSCRIPTION = () => () => {};
const NO_SNAPSHOT = () => undefined;

export function useDashboardSettingInstances(
    dashboardSettingsService: DashboardSettingsService,
): readonly DashboardSettingInstance<any, any>[] {
    return usePublishSubscribeTopicValue(dashboardSettingsService, DashboardSettingsServiceTopic.ACTIVE_SETTINGS);
}

// The instance of `definition`, or null while the dashboard setting is not active.
export function useDashboardSetting<TValue, TConstraints>(
    dashboardSettingsService: DashboardSettingsService,
    definition: DashboardSettingDefinition<TValue, TConstraints>,
): DashboardSettingInstance<TValue, TConstraints> | null {
    useDashboardSettingInstances(dashboardSettingsService);
    return dashboardSettingsService.getSetting(definition);
}

// Subscribes to a topic of an instance that may not exist (yet) - undefined while it doesn't.
export function useDashboardSettingInstanceTopic<
    TValue,
    TConstraints,
    TTopic extends DashboardSettingInstanceTopic,
>(
    instance: DashboardSettingInstance<TValue, TConstraints> | null,
    topic: TTopic,
): DashboardSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic] | undefined {
    const subscribe = React.useMemo(
        () => (instance ? instance.getPublishSubscribeDelegate().makeSubscriberFunction(topic) : NO_SUBSCRIPTION),
        [instance, topic],
    );
    const getSnapshot = React.useMemo(
        () => (instance ? instance.makeSnapshotGetter(topic) : NO_SNAPSHOT),
        [instance, topic],
    );

    return React.useSyncExternalStore(subscribe, getSnapshot);
}

// The dashboard value, or undefined while the dashboard setting is not active.
export function useDashboardSettingValue<TValue, TConstraints>(
    dashboardSettingsService: DashboardSettingsService,
    definition: DashboardSettingDefinition<TValue, TConstraints>,
): TValue | undefined {
    const instance = useDashboardSetting(dashboardSettingsService, definition);
    return useDashboardSettingInstanceTopic(instance, DashboardSettingInstanceTopic.VALUE);
}

export function useDashboardSettingConstraints<TValue, TConstraints>(
    dashboardSettingsService: DashboardSettingsService,
    definition: DashboardSettingDefinition<TValue, TConstraints>,
): TConstraints | undefined {
    const instance = useDashboardSetting(dashboardSettingsService, definition);
    return useDashboardSettingInstanceTopic(instance, DashboardSettingInstanceTopic.CONSTRAINTS);
}

export type UseDashboardSettingConsumerOptions = {
    // While true, the consumer is marked as pending - its options are being recomputed - and the
    // `constraints` passed in are not contributed.
    isLoading?: boolean;
};

export type DashboardSettingConsumerResult<TValue> = {
    isDashboardControlled: boolean;
    // The dashboard value - undefined while the dashboard setting is not active, in which case the consumer
    // should fall back to its own local value.
    value: TValue | undefined;
};

/**
 * Makes a component a consumer of a dashboard setting: while it is active, `constraints`
 * (the options this consumer can offer) are contributed to it, and the dashboard value is returned.
 * Pass `null` as `constraints` when the consumer has no opinion. Constraints are deep-compared, so a new
 * array on every render is fine.
 */
export function useDashboardSettingConsumer<TValue, TConstraints>(
    dashboardSettingsService: DashboardSettingsService,
    definition: DashboardSettingDefinition<TValue, TConstraints>,
    constraints: TConstraints | null,
    options?: UseDashboardSettingConsumerOptions,
): DashboardSettingConsumerResult<TValue> {
    const instance = useDashboardSetting(dashboardSettingsService, definition);
    const value = useDashboardSettingInstanceTopic(instance, DashboardSettingInstanceTopic.VALUE);

    const [sourceId] = React.useState(() => v4());
    const [stableConstraints] = useStableProp(constraints);
    const handleRef = React.useRef<DashboardSettingConstraintSourceHandle<TConstraints> | null>(null);

    const isLoading = options?.isLoading ?? false;

    React.useEffect(
        function registerConstraintSourceEffect() {
            if (!instance) {
                return;
            }

            const handle = instance.registerConstraintSource(sourceId);
            handleRef.current = handle;

            return function unregisterConstraintSource() {
                handle.unregister();
                handleRef.current = null;
            };
        },
        [instance, sourceId],
    );

    // Declared after the registration effect, so it runs after it within the same commit.
    React.useEffect(
        function contributeConstraintsEffect() {
            const handle = handleRef.current;
            if (!handle) {
                return;
            }

            if (isLoading) {
                handle.markPending();
            } else if (stableConstraints === null) {
                handle.clearConstraints();
            } else {
                handle.updateConstraints(stableConstraints);
            }
        },
        [instance, stableConstraints, isLoading],
    );

    return { isDashboardControlled: instance !== null, value };
}
