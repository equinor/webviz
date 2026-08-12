import {
    PublishSubscribeDelegate,
    usePublishSubscribeTopicValue,
    type PublishSubscribe,
} from "@lib/utils/PublishSubscribeDelegate";

import type { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";
import { ElevatedSettingInstance, type ElevatedSettingInstanceOptions } from "./ElevatedSettingInstance";
import { ElevatedSettingRegistry } from "./ElevatedSettingRegistry";
import type { SerializedElevatedSettingsState } from "./ElevatedSettingsService.schema";

export enum ElevatedSettingsServiceTopic {
    ACTIVE_SETTINGS = "ACTIVE_SETTINGS",
}

export type ElevatedSettingsServiceTopicPayloads = {
    [ElevatedSettingsServiceTopic.ACTIVE_SETTINGS]: Map<string, ElevatedSettingInstance<any, any>>;
};

export class ElevatedSettingsService implements PublishSubscribe<ElevatedSettingsServiceTopicPayloads> {
    private _instances = new Map<string, ElevatedSettingInstance<any, any>>();
    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<ElevatedSettingsServiceTopicPayloads>();

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ElevatedSettingsServiceTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof ElevatedSettingsServiceTopicPayloads>(
        topic: T,
    ): () => ElevatedSettingsServiceTopicPayloads[T] {
        if (topic !== ElevatedSettingsServiceTopic.ACTIVE_SETTINGS) {
            throw new Error(`Invalid topic '${topic}' for ElevatedSettingsService`);
        }

        return () => this._instances;
    }

    addSetting<TValue, TConstraints>(
        definition: ElevatedSettingDefinition<TValue, TConstraints>,
        options?: ElevatedSettingInstanceOptions<TValue, TConstraints>,
    ): ElevatedSettingInstance<TValue, TConstraints> {
        if (this._instances.has(definition.key)) {
            throw new Error(`Elevated setting '${definition.key}' is already active.`);
        }

        const instance = new ElevatedSettingInstance(definition, options);

        this._instances = new Map(this._instances).set(definition.key, instance);

        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS);

        return instance;
    }

    removeSetting<TValue, TConstraints>(definition: ElevatedSettingDefinition<TValue, TConstraints>): void {
        const instance = this._instances.get(definition.key);

        if (!instance) {
            return;
        }

        const newInstances = new Map(this._instances);
        newInstances.delete(definition.key);
        this._instances = newInstances;

        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS);
    }

    getSetting<TValue, TConstraints>(
        definition: ElevatedSettingDefinition<TValue, TConstraints>,
    ): ElevatedSettingInstance<TValue, TConstraints> {
        const instance = this._instances.get(definition.key);

        if (!instance) {
            throw new Error(`Elevated setting with key '${definition.key}' is not registered.`);
        }

        return instance as ElevatedSettingInstance<TValue, TConstraints>;
    }

    hasSetting<TValue, TConstraints>(definition: ElevatedSettingDefinition<TValue, TConstraints>): boolean {
        return this._instances.has(definition.key);
    }

    serializeState(): SerializedElevatedSettingsState {
        const state: SerializedElevatedSettingsState = {};

        for (const [key, instance] of this._instances) {
            state[key] = instance.getValue();
        }

        return state;
    }

    deserializeState(state: SerializedElevatedSettingsState): void {
        for (const key of Object.keys(state)) {
            const definition = ElevatedSettingRegistry.getRegisteredSetting(key);
            if (!definition) {
                continue;
            }

            const instance = this._instances.get(key) ?? this.addSetting(definition);
            instance.setValue(state[key]);
        }
    }
}

export function useElevatedSettingInstances(
    elevatedSettingsService: ElevatedSettingsService,
): Map<string, ElevatedSettingInstance<any, any>> {
    return usePublishSubscribeTopicValue(elevatedSettingsService, ElevatedSettingsServiceTopic.ACTIVE_SETTINGS);
}
