import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";
import { SettingTopic } from "./SettingDelegate";
import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { Dependency } from "../Dependency";
import { GlobalSettings, LayerManager, LayerManagerTopic } from "../LayerManager";
import {
    AvailableValuesType,
    EachAvailableValuesType,
    SerializedSettingsState,
    Setting,
    Settings,
    SettingsContext,
    UpdateFunc,
} from "../interfaces";

export enum SettingsContextLoadingState {
    LOADING = "LOADING",
    LOADED = "LOADED",
    FAILED = "FAILED",
}

export enum SettingsContextDelegateTopic {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    LAYER_MANAGER_CHANGED = "LAYER_MANAGER_CHANGED",
    LOADING_STATE_CHANGED = "LOADING_STATE_CHANGED",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.LAYER_MANAGER_CHANGED]: void;
    [SettingsContextDelegateTopic.LOADING_STATE_CHANGED]: SettingsContextLoadingState;
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
    private _layerManager: LayerManager;
    private _settings: { [K in TKey]: Setting<TSettings[K]> } = {} as { [K in TKey]: Setting<TSettings[K]> };
    private _overriddenSettings: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingsContextDelegateTopic>();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _loadingState: SettingsContextLoadingState = SettingsContextLoadingState.LOADING;

    constructor(
        context: SettingsContext<TSettings, TKey>,
        layerManager: LayerManager,
        settings: { [K in TKey]: Setting<TSettings[K]> }
    ) {
        this._parentContext = context;
        this._layerManager = layerManager;

        for (const key in settings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key]
                    .getDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                    this.handleSettingChanged();
                })
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key]
                    .getDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.LOADING_STATE_CHANGED)(() => {
                    this.handleSettingsLoadingStateChanged();
                })
            );
        }

        this._settings = settings;

        this.createDependencies();
    }

    getLayerManager(): LayerManager {
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

        if (!this._parentContext.areCurrentSettingsValid) {
            return true;
        }

        const settings: TSettings = {} as TSettings;
        for (const key in this._settings) {
            settings[key] = this._settings[key].getDelegate().getValue();
        }

        return this._parentContext.areCurrentSettingsValid(settings);
    }

    areAllSettingsLoaded(): boolean {
        for (const key in this._settings) {
            if (this._settings[key].getDelegate().getIsLoading()) {
                return false;
            }
        }

        return true;
    }

    areAllSettingsInitialized(): boolean {
        for (const key in this._settings) {
            if (
                !this._settings[key].getDelegate().getIsInitialized() ||
                this._settings[key].getDelegate().isPersistedValue()
            ) {
                return false;
            }
        }

        return true;
    }

    isSomePersistedSettingNotValid(): boolean {
        for (const key in this._settings) {
            if (
                !this._settings[key].getDelegate().getIsLoading() &&
                this._settings[key].getDelegate().isPersistedValue() &&
                !this._settings[key].getDelegate().isValueValid() &&
                this._settings[key].getDelegate().getIsInitialized()
            ) {
                return true;
            }
        }

        return false;
    }

    getInvalidSettings(): string[] {
        const invalidSettings: string[] = [];
        for (const key in this._settings) {
            if (!this._settings[key].getDelegate().isValueValid()) {
                invalidSettings.push(this._settings[key].getLabel());
            }
        }

        return invalidSettings;
    }

    private setLoadingState(loadingState: SettingsContextLoadingState) {
        if (this._loadingState === loadingState) {
            return;
        }

        this._loadingState = loadingState;
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.LOADING_STATE_CHANGED);
    }

    private handleSettingChanged() {
        // this.getLayerManager().publishTopic(LayerManagerTopic.SETTINGS_CHANGED);

        if (!this.areAllSettingsLoaded() || !this.areAllSettingsInitialized()) {
            this.setLoadingState(SettingsContextLoadingState.LOADING);
            return;
        }

        if (this.isSomePersistedSettingNotValid() || !this.areCurrentSettingsValid()) {
            this.setLoadingState(SettingsContextLoadingState.FAILED);
            return;
        }

        this.setLoadingState(SettingsContextLoadingState.LOADED);
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);
    }

    private handleSettingsLoadingStateChanged() {
        for (const key in this._settings) {
            if (this._settings[key].getDelegate().getIsLoading()) {
                this.setLoadingState(SettingsContextLoadingState.LOADING);
                return;
            }
        }

        this.setLoadingState(SettingsContextLoadingState.LOADED);
    }

    setAvailableValues<K extends TKey>(key: K, availableValues: AvailableValuesType<TSettings[K]>): void {
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
            if (topic === SettingsContextDelegateTopic.LAYER_MANAGER_CHANGED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.LOADING_STATE_CHANGED) {
                return this._loadingState;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SettingsContextDelegateTopic> {
        return this._publishSubscribeDelegate;
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
            const settingDelegate = this._settings[key as TKey].getDelegate();
            settingDelegate.deserializeValue(value);
            if (settingDelegate.isStatic()) {
                settingDelegate.maybeResetPersistedValue();
            }
        }
    }

    createDependencies(): void {
        const makeSettingGetter = <K extends TKey>(key: K, handler: (value: TSettings[K]) => void) => {
            const handleChange = (): void => {
                handler(this._settings[key].getDelegate().getValue());
            };
            this._settings[key]
                .getDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(handleChange);

            return handleChange;
        };

        const makeGlobalSettingGetter = <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K]) => void
        ) => {
            const handleChange = (): void => {
                handler(this.getLayerManager.bind(this)().getGlobalSetting(key));
            };
            this.getLayerManager()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED)(handleChange);

            return handleChange;
        };

        const availableSettingsUpdater = <K extends TKey>(
            settingKey: K,
            updateFunc: UpdateFunc<EachAvailableValuesType<TSettings[K]>, TSettings, K>
        ): Dependency<EachAvailableValuesType<TSettings[K]>, TSettings, K> => {
            const dependency = new Dependency<EachAvailableValuesType<TSettings[K]>, TSettings, K>(
                this as unknown as SettingsContextDelegate<TSettings, K>,
                updateFunc,
                makeSettingGetter,
                makeGlobalSettingGetter
            );

            dependency.subscribe((availableValues: AvailableValuesType<TSettings[K]> | null) => {
                if (availableValues === null) {
                    this.setAvailableValues(settingKey, [] as unknown as AvailableValuesType<TSettings[K]>);
                    return;
                }
                this.setAvailableValues(settingKey, availableValues);
            });

            dependency.subscribeLoading((loading: boolean, hasDependencies: boolean) => {
                this._settings[settingKey].getDelegate().setIsLoading(loading);

                if (!hasDependencies) {
                    this.handleSettingChanged();
                }
            });

            dependency.initialize();

            return dependency;
        };

        const helperDependency = <T>(
            update: (args: {
                getLocalSetting: <T extends TKey>(settingName: T) => TSettings[T];
                getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
                getHelperDependency: <TDep>(dep: Dependency<TDep, TSettings, TKey>) => TDep | null;
                abortSignal: AbortSignal;
            }) => T
        ) => {
            const dependency = new Dependency<T, TSettings, TKey>(
                this as unknown as SettingsContextDelegate<TSettings, TKey>,
                update,
                makeSettingGetter,
                makeGlobalSettingGetter
            );

            dependency.initialize();

            return dependency;
        };

        if (this._parentContext.defineDependencies) {
            this._parentContext.defineDependencies({
                availableSettingsUpdater,
                helperDependency,
                workbenchSession: this.getLayerManager().getWorkbenchSession(),
                workbenchSettings: this.getLayerManager().getWorkbenchSettings(),
                queryClient: this.getLayerManager().getQueryClient(),
            });
        }
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
