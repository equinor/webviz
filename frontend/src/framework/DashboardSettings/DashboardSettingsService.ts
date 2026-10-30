import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { DashboardSettingDefinition } from "./DashboardSettingDefinition";
import {
    DashboardSettingInstance,
    DashboardSettingInstanceTopic,
    DashboardSettingValueSource,
} from "./DashboardSettingInstance";
import { DashboardSettingRegistry } from "./DashboardSettingRegistry";
import type { SerializedDashboardSettingsState } from "./DashboardSettingsService.schema";

export enum DashboardSettingsServiceTopic {
    ACTIVE_SETTINGS = "ACTIVE_SETTINGS",
    // Bumped whenever something that is persisted changes (settings added/removed, values changed).
    STATE_REVISION = "STATE_REVISION",
}

export type DashboardSettingsServiceTopicPayloads = {
    [DashboardSettingsServiceTopic.ACTIVE_SETTINGS]: readonly DashboardSettingInstance<any, any>[];
    [DashboardSettingsServiceTopic.STATE_REVISION]: number;
};

export type AddDashboardSettingOptions<TValue, TConstraints> = {
    // An explicit initial value, e.g. from a template. Treated like a restored value: kept (and flagged)
    // if it doesn't fit the current context, instead of being fixed up.
    value?: TValue;
    constraintOverride?: TConstraints;
};

export class DashboardSettingsService implements PublishSubscribe<DashboardSettingsServiceTopicPayloads> {
    private _instances = new Map<string, DashboardSettingInstance<any, any>>();
    // Sorted by registration order - rebuilt on add/remove only, so the snapshot stays reference-stable.
    private _activeSettings: readonly DashboardSettingInstance<any, any>[] = [];
    private _instanceUnsubscribeFunctions = new Map<string, () => void>();
    private _stateRevision = 0;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<DashboardSettingsServiceTopicPayloads>();

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DashboardSettingsServiceTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DashboardSettingsServiceTopic>(topic: T): () => DashboardSettingsServiceTopicPayloads[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case DashboardSettingsServiceTopic.ACTIVE_SETTINGS:
                    return this._activeSettings;
                case DashboardSettingsServiceTopic.STATE_REVISION:
                    return this._stateRevision;
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };

        return snapshotGetter;
    }

    addSetting<TValue, TConstraints>(
        definition: DashboardSettingDefinition<TValue, TConstraints>,
        options?: AddDashboardSettingOptions<TValue, TConstraints>,
    ): DashboardSettingInstance<TValue, TConstraints> {
        if (this._instances.has(definition.key)) {
            throw new Error(`Dashboard setting '${definition.key}' is already active.`);
        }

        const hasExplicitValue = options !== undefined && "value" in options;

        // Seeded at construction rather than via `setValue` afterwards - adapters connect synchronously
        // when ACTIVE_SETTINGS is published, and must not see the plain default first.
        const instance = new DashboardSettingInstance(definition, {
            value: hasExplicitValue ? options.value : definition.defaultValue,
            valueSource: hasExplicitValue ? DashboardSettingValueSource.RESTORED : DashboardSettingValueSource.USER,
            constraintOverride: options?.constraintOverride,
        });

        this._instances.set(definition.key, instance);
        this._instanceUnsubscribeFunctions.set(
            definition.key,
            instance
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DashboardSettingInstanceTopic.VALUE)(() => this.bumpStateRevision()),
        );

        this.updateActiveSettings();
        this.bumpStateRevision();

        return instance;
    }

    removeSetting(definition: DashboardSettingDefinition<any, any>): void {
        const instance = this._instances.get(definition.key);
        if (!instance) {
            return;
        }

        this._instanceUnsubscribeFunctions.get(definition.key)?.();
        this._instanceUnsubscribeFunctions.delete(definition.key);
        this._instances.delete(definition.key);
        instance.beforeDestroy();

        this.updateActiveSettings();
        this.bumpStateRevision();
    }

    getSetting<TValue, TConstraints>(
        definition: DashboardSettingDefinition<TValue, TConstraints>,
    ): DashboardSettingInstance<TValue, TConstraints> | null {
        return (this._instances.get(definition.key) as DashboardSettingInstance<TValue, TConstraints>) ?? null;
    }

    hasSetting(definition: DashboardSettingDefinition<any, any>): boolean {
        return this._instances.has(definition.key);
    }

    getActiveSettings(): readonly DashboardSettingInstance<any, any>[] {
        return this._activeSettings;
    }

    serializeState(): SerializedDashboardSettingsState {
        const state: SerializedDashboardSettingsState = {};

        for (const instance of this._activeSettings) {
            const definition = instance.getDefinition();
            state[definition.key] = definition.serializeValue(instance.getValue());
        }

        return state;
    }

    // Replaces the active settings with the serialized ones. Values are restored as-is - they are not
    // fixed up if they turn out to be invalid once the constraint sources have reported back.
    deserializeState(state: SerializedDashboardSettingsState): void {
        for (const instance of this._activeSettings) {
            if (!(instance.getDefinition().key in state)) {
                this.removeSetting(instance.getDefinition());
            }
        }

        for (const [key, serializedValue] of Object.entries(state)) {
            const definition = DashboardSettingRegistry.getRegisteredSetting(key);
            if (!definition) {
                console.warn(`Skipping unknown dashboard setting '${key}' in persisted state.`);
                continue;
            }

            let value: unknown;
            try {
                value = definition.deserializeValue(serializedValue);
            } catch (error) {
                console.warn(`Failed to deserialize value of dashboard setting '${key}' - skipping it.`, error);
                continue;
            }

            const instance = this._instances.get(key);
            if (instance) {
                instance.setValue(value, DashboardSettingValueSource.RESTORED);
            } else {
                this.addSetting(definition, { value });
            }
        }
    }

    beforeDestroy(): void {
        for (const instance of this._activeSettings) {
            this.removeSetting(instance.getDefinition());
        }
    }

    private updateActiveSettings(): void {
        this._activeSettings = Array.from(this._instances.values()).sort(
            (a, b) =>
                DashboardSettingRegistry.getRegistrationIndex(a.getDefinition().key) -
                DashboardSettingRegistry.getRegistrationIndex(b.getDefinition().key),
        );
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingsServiceTopic.ACTIVE_SETTINGS);
    }

    private bumpStateRevision(): void {
        this._stateRevision++;
        this._publishSubscribeDelegate.notifySubscribers(DashboardSettingsServiceTopic.STATE_REVISION);
    }
}
