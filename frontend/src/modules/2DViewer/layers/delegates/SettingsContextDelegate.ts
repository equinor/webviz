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
    AVAILABLE_SETTINGS_CHANGED = "AVAILABLE_SETTINGS_CHANGED",
    LOADING_STATE = "LOADING_STATE_CHANGED",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED]: void;
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
    private _cachedValues: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _values: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _overriddenSettings: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _availableSettingsValues: Partial<{ [K in TKey]: AvailableValuesType<Exclude<TSettings[K], null>> }> = {};
    private _publishSubscribeHandler = new PublishSubscribeDelegate<SettingsContextDelegateTopic>();
    private _onSettingsChanged: FetchDataFunction<TSettings, TKey> | null = null;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _loadingStatus: SettingsContextLoadingState = SettingsContextLoadingState.LOADED;

    constructor(context: SettingsContext<TSettings, TKey>, settings: { [K in TKey]: Setting<TSettings[K]> }) {
        this._parentContext = context;

        for (const key in settings) {
            this._values[key] = settings[key].getDelegate().getValue();
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key]
                    .getDelegate()
                    .getPublishSubscribeHandler()
                    .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                    this._values[key] = settings[key].getDelegate().getValue();
                    this.handleSettingsChanged();
                })
            );
            this._availableSettingsValues[key] = [] as AvailableValuesType<
                Exclude<TSettings[Extract<TKey, string>], null>
            >;
        }

        this._settings = settings;
        this._cachedValues = { ...this._values };
    }

    getLayerManager(): LayerManager {
        if (!this._layerManager) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        if (layerManager) {
            this._parentContext.fetchData(this._cachedValues, this._values);
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "global-settings",
                layerManager.getPublishSubscribeHandler().subscribe(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED, () => {
                    this._parentContext.fetchData(this._cachedValues, this._values);
                })
            );
        } else {
            this._unsubscribeHandler.unsubscribe("global-settings");
        }
    }

    private async fetchData(): Promise<void> {
        this.setLoadingState(SettingsContextLoadingState.LOADING);
        const result = await this._parentContext.fetchData(this._cachedValues, this._values);
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
        if (this._loadingStatus === SettingsContextLoadingState.LOADING) {
            return;
        }

        if (!isEqual(this._cachedValues, this._values)) {
            this.fetchData().then(() => {
                if (this._onSettingsChanged) {
                    this._onSettingsChanged(this._cachedValues, this._values);
                }
                this._cachedValues = { ...this._values };
                this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);

                this.getLayerManager().publishTopic(LayerManagerTopic.SETTINGS_CHANGED);
            });
        }
    }

    setAvailableValues<K extends TKey>(
        key: K,
        availableValues: AvailableValuesType<Exclude<TSettings[K], null>>
    ): void {
        this._availableSettingsValues[key] = availableValues;
        this._settings[key].getDelegate().setAvailableValues(availableValues);
        this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED);

        this.getLayerManager().publishTopic(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED);
    }

    getAvailableValues<K extends TKey>(key: K): AvailableValuesType<Exclude<TSettings[K], null>> {
        const availableValues = this._availableSettingsValues[key];
        if (!availableValues) {
            throw new Error(`No available values for key: ${key.toString()}`);
        }
        return availableValues;
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
            if (topic === SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED) {
                return this._availableSettingsValues;
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

    serializeSettings(): SerializedSettingsState {
        const serializedSettings: SerializedSettingsState = {};
        for (const key in this._settings) {
            serializedSettings[key] = this._settings[key].getDelegate().serializeValue();
        }
        return serializedSettings;
    }
}
