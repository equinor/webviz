import { isEqual } from "lodash";

import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";
import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { LayerManager, LayerManagerTopic } from "../LayerManager";
import {
    AvailableValuesType,
    SerializedSettingsState,
    Setting,
    SettingTopic,
    Settings,
    SettingsContext,
} from "../interfaces";

export enum SettingsContextLoadingState {
    LOADING = "LOADING",
    LOADED = "LOADED",
    FAILED = "FAILED",
}

export enum SettingsContextDelegateTopic {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    REFETCH_REQUIRED = "REFETCH_REQUIRED",
    LOADING_STATE = "LOADING_STATE_CHANGED",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.REFETCH_REQUIRED]: void;
    [SettingsContextDelegateTopic.LOADING_STATE]: boolean;
};

export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (oldValues: { [K in TKey]: TSettings[K] }, newValues: { [K in TKey]: TSettings[K] }): void;
}

export type SettingsContextDelegateState<TSettings extends Settings, TKey extends keyof TSettings> = {
    values: { [K in TKey]: TSettings[K] };
};

export class SettingsContextDelegate<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings>
    implements PublishSubscribe<SettingsContextDelegateTopic, SettingsContextDelegatePayloads>
{
    private _parentContext: SettingsContext<TSettings, TKey>;
    private _layerManager: LayerManager | null = null;
    private _settings: { [K in TKey]: Setting<TSettings[K]> } = {} as { [K in TKey]: Setting<TSettings[K]> };
    private _cachedValues: { [K in TKey]?: TSettings[K] } = {} as { [K in TKey]?: TSettings[K] };
    private _overriddenSettings: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _publishSubscribeHandler = new PublishSubscribeDelegate<SettingsContextDelegateTopic>();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _loadingStatus: SettingsContextLoadingState = SettingsContextLoadingState.LOADED;

    constructor(context: SettingsContext<TSettings, TKey>, settings: { [K in TKey]: Setting<TSettings[K]> }) {
        this._parentContext = context;

        for (const key in settings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key]
                    .getDelegate()
                    .getPublishSubscribeHandler()
                    .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                    this.handleSettingsChanged();
                })
            );
        }

        this._settings = settings;
        this._cachedValues = { ...this.getValues() };
    }

    getLayerManager(): LayerManager {
        if (!this._layerManager) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }

    getValues(): { [K in TKey]?: TSettings[K] } {
        const settings: { [K in TKey]?: TSettings[K] } = {} as { [K in TKey]?: TSettings[K] };
        for (const key in this._settings) {
            if (this._settings[key].getDelegate().isPersistedValue()) {
                settings[key] = undefined;
                continue;
            }
            settings[key] = this._settings[key].getDelegate().getValue();
        }

        return settings;
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        if (layerManager) {
            const settings: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
            for (const key in this._settings) {
                settings[key] = this._settings[key].getDelegate().getValue();
            }
            this._parentContext.fetchData(this._cachedValues, this.getValues());
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "global-settings",
                layerManager.getPublishSubscribeHandler().subscribe(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED, () => {
                    this.fetchData();
                })
            );
        } else {
            this._unsubscribeHandler.unsubscribe("global-settings");
        }

        this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);
    }

    private async fetchData(): Promise<void> {
        this.setLoadingState(SettingsContextLoadingState.LOADING);
        const values = this.getValues();
        const result = await this._parentContext.fetchData(this._cachedValues, values);
        if (result) {
            this.setLoadingState(SettingsContextLoadingState.LOADED);
        } else {
            this.setLoadingState(SettingsContextLoadingState.FAILED);
        }
    }

    private setLoadingState(loadingState: SettingsContextLoadingState): void {
        this._loadingStatus = loadingState;
        this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.LOADING_STATE);
    }

    getLoadingState(): SettingsContextLoadingState {
        return this._loadingStatus;
    }

    setOverriddenSettings(overriddenSettings: { [K in TKey]: TSettings[K] }): void {
        this._overriddenSettings = overriddenSettings;
        for (const key in this._settings) {
            if (Object.keys(this._overriddenSettings).includes(key)) {
                this._settings[key].getDelegate().setOverriddenValue(this._overriddenSettings[key]);
            } else {
                this._settings[key].getDelegate().setOverriddenValue(undefined);
            }
        }
    }

    areCurrentSettingsValid(): boolean {
        for (const key in this._settings) {
            if (!this._settings[key].getDelegate().isValueValid()) {
                return false;
            }
        }

        return this._parentContext.areCurrentSettingsValid();
    }

    private handleSettingsChanged() {
        const values = this.getValues();
        if (!isEqual(this._cachedValues, values)) {
            this.fetchData().then(() => {
                this._cachedValues = { ...values };
                this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);

                this.getLayerManager().publishTopic(LayerManagerTopic.SETTINGS_CHANGED);
            });
        }
    }

    setAvailableValues<K extends TKey>(
        key: K,
        availableValues: AvailableValuesType<Exclude<TSettings[K], null>>
    ): void {
        const settingDelegate = this._settings[key].getDelegate();
        settingDelegate.setAvailableValues(availableValues);

        this.getLayerManager().publishTopic(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED);
    }

    getSettings() {
        return this._settings;
    }

    makeSnapshotGetter<T extends SettingsContextDelegateTopic>(topic: T): () => SettingsContextDelegatePayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingsContextDelegateTopic.SETTINGS_CHANGED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.REFETCH_REQUIRED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.LOADING_STATE) {
                return this._loadingStatus;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeDelegate<SettingsContextDelegateTopic> {
        return this._publishSubscribeHandler;
    }

    serializeSettings(): SerializedSettingsState<TSettings> {
        const serializedSettings: SerializedSettingsState<TSettings> = {} as SerializedSettingsState<TSettings>;
        for (const key in this._settings) {
            serializedSettings[key] = this._settings[key].getDelegate().serializeValue();
        }
        return serializedSettings;
    }

    deserializeSettings(serializedSettings: SerializedSettingsState<TSettings>): void {
        for (const [key, value] of Object.entries(serializedSettings)) {
            this._settings[key as TKey].getDelegate().deserializeValue(value);
        }
    }
}
