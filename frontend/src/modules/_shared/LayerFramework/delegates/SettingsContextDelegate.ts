import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";
import { Dependency } from "./_utils/Dependency";

import { PublishSubscribe, PublishSubscribeDelegate } from "../../utils/PublishSubscribeDelegate";
import { DataLayer } from "../framework/DataLayer/DataLayer";
import { DataLayerManager, GlobalSettings, LayerManagerTopic } from "../framework/DataLayerManager/DataLayerManager";
import { Group } from "../framework/Group/Group";
import { SettingManager, SettingTopic } from "../framework/SettingManager/SettingManager";
import { SharedSetting } from "../framework/SharedSetting/SharedSetting";
import {
    AvailableValuesType,
    CustomSettingsHandler,
    EachAvailableValuesType,
    NullableStoredData,
    SerializedSettingsState,
    Settings,
    SharedSettingsProvider,
    StoredData,
    TupleIndices,
    UpdateFunc,
    instanceofSharedSettingsProvider,
} from "../interfaces";
import { MakeSettingTypesMap } from "../settings/settingsTypes";

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

/*
 * The SettingsContextDelegate class is responsible for giving the settings of a layer a common context as
 * many settings are interdependent.
 *
 * It creates a dependency graph for all settings and implements dependencies between both themselves and global settings.
 * It also takes care of overriding settings that are set by shared settings.
 * It also takes care of notifying its subscribers (e.g. the respective layer delegate) when the settings change.
 *
 */
export class SettingsContextDelegate<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TStoredData extends StoredData = Record<string, never>,
    TKey extends TupleIndices<TSettings> = TupleIndices<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> implements PublishSubscribe<SettingsContextDelegatePayloads>
{
    private _owner: DataLayer<TSettings, any, TStoredData, TSettingTypes>;
    private _customSettingsHandler: CustomSettingsHandler<TSettings, TStoredData, TSettingTypes, TKey, TStoredDataKey>;
    private _layerManager: DataLayerManager;
    private _settings: { [K in TKey]: SettingManager<TSettingTypes[TSettings[K]]> } = {} as {
        [K in TKey]: SettingManager<TSettingTypes[TSettings[K]]>;
    };
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingsContextDelegatePayloads>();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _loadingState: SettingsContextLoadingState = SettingsContextLoadingState.LOADING;
    private _storedData: NullableStoredData<TStoredData> = {} as NullableStoredData<TStoredData>;

    constructor(
        owner: DataLayer<TSettings, any, TStoredData, TSettingTypes>,
        customSettingsHandler: CustomSettingsHandler<TSettings, TStoredData, TSettingTypes, TKey, TStoredDataKey>,
        layerManager: DataLayerManager,
        settings: { [K in TKey]: SettingManager<TSettings[K]> }
    ) {
        this._owner = owner;
        this._customSettingsHandler = customSettingsHandler;
        this._layerManager = layerManager;

        for (const key in settings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                    this.handleSettingChanged();
                })
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.LOADING_STATE_CHANGED)(
                    () => {
                        this.handleSettingsLoadingStateChanged();
                    }
                )
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "layer-manager",
                layerManager
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(LayerManagerTopic.SHARED_SETTINGS_CHANGED)(() => {
                    this.handleSharedSettingsChanged();
                })
            );

            this._unsubscribeHandler.registerUnsubscribeFunction(
                "layer-manager",
                layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(
                    () => {
                        this.handleSharedSettingsChanged();
                    }
                )
            );
        }

        this._settings = settings;

        this.createDependencies();
    }

    getLayerManager(): DataLayerManager {
        return this._layerManager;
    }

    getValues(): { [K in TKey]?: TSettingTypes[TSettings[K]] } {
        const settings: { [K in TKey]?: TSettingTypes[TSettings[K]] } = {} as {
            [K in TKey]?: TSettingTypes[TSettings[K]];
        };
        for (const key in this._settings) {
            if (this._settings[key].isPersistedValue()) {
                settings[key] = undefined;
                continue;
            }
            settings[key] = this._settings[key].getValue();
        }

        return settings;
    }

    handleSharedSettingsChanged() {
        const parentGroup = this._owner.getItemDelegate().getParentGroup();
        if (!parentGroup) {
            return;
        }

        const sharedSettingsProviders: SharedSettingsProvider[] = parentGroup.getAncestorAndSiblingItems(
            (item) => item instanceof SharedSetting
        ) as unknown as SharedSettingsProvider[];

        const ancestorGroups: SharedSettingsProvider[] = parentGroup.getAncestors(
            (item) => item instanceof Group && instanceofSharedSettingsProvider(item)
        ) as unknown as SharedSettingsProvider[];
        sharedSettingsProviders.push(...ancestorGroups);

        for (const key in this._settings) {
            this._settings[key].checkForOverrides(sharedSettingsProviders);
        }
    }

    areCurrentSettingsValid(): boolean {
        for (const key in this._settings) {
            if (!this._settings[key].isValueValid()) {
                return false;
            }
        }

        return true;
    }

    areAllSettingsLoaded(): boolean {
        for (const key in this._settings) {
            if (this._settings[key].isLoading()) {
                return false;
            }
        }

        return true;
    }

    areAllSettingsInitialized(): boolean {
        for (const key in this._settings) {
            if (!this._settings[key].isInitialized() || this._settings[key].isPersistedValue()) {
                return false;
            }
        }

        return true;
    }

    isSomePersistedSettingNotValid(): boolean {
        for (const key in this._settings) {
            if (
                !this._settings[key].isLoading() &&
                this._settings[key].isPersistedValue() &&
                !this._settings[key].isValueValid() &&
                this._settings[key].isInitialized()
            ) {
                return true;
            }
        }

        return false;
    }

    getInvalidSettings(): string[] {
        const invalidSettings: string[] = [];
        for (const key in this._settings) {
            if (!this._settings[key].isValueValid()) {
                invalidSettings.push(this._settings[key].getLabel());
            }
        }

        return invalidSettings;
    }

    setAvailableValues<K extends TKey>(key: K, availableValues: AvailableValuesType<TSettings[K]>): void {
        const settingDelegate = this._settings[key];
        settingDelegate.setAvailableValues(availableValues);

        this.getLayerManager().publishTopic(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED);
    }

    setStoredData<K extends keyof TStoredData>(key: K, data: TStoredData[K] | null): void {
        this._storedData[key] = data;
    }

    getSettings() {
        return this._settings;
    }

    getStoredData(key: TStoredDataKey): TStoredData[TStoredDataKey] | null {
        return this._storedData[key];
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

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SettingsContextDelegatePayloads> {
        return this._publishSubscribeDelegate;
    }

    serializeSettings(): SerializedSettingsState<TSettingTypes> {
        const serializedSettings: SerializedSettingsState<TSettingTypes> = {} as SerializedSettingsState<TSettingTypes>;
        for (const key in this._settings) {
            serializedSettings[key] = this._settings[key].serializeValue();
        }
        return serializedSettings;
    }

    deserializeSettings(serializedSettings: SerializedSettingsState<TSettingTypes>): void {
        for (const [key, value] of Object.entries(serializedSettings)) {
            const settingDelegate = this._settings[key as TKey];
            settingDelegate.deserializeValue(value as string);
            if (settingDelegate.isStatic()) {
                settingDelegate.maybeResetPersistedValue();
            }
        }
    }

    createDependencies(): void {
        this._unsubscribeHandler.unsubscribe("dependencies");

        const dependencies: Dependency<any, any, any, any>[] = [];

        const makeLocalSettingGetter = <K extends TKey>(key: K, handler: (value: TSettingTypes[K]) => void) => {
            const handleChange = (): void => {
                handler(this._settings[key].getValue());
            };
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(
                    handleChange
                )
            );

            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key]

                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.PERSISTED_STATE_CHANGED)(handleChange)
            );

            return handleChange;
        };

        const makeGlobalSettingGetter = <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K]) => void
        ) => {
            const handleChange = (): void => {
                handler(this.getLayerManager.bind(this)().getGlobalSetting(key));
            };
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this.getLayerManager()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED)(handleChange)
            );

            return handleChange;
        };

        const availableSettingsUpdater = <K extends TKey>(
            settingKey: K,
            updateFunc: UpdateFunc<EachAvailableValuesType<TSettingTypes[K]>, TSettings, TSettingTypes, K>
        ): Dependency<EachAvailableValuesType<TSettingTypes[K]>, TSettings, TSettingTypes, K> => {
            const dependency = new Dependency<EachAvailableValuesType<TSettingTypes[K]>, TSettings, TSettingTypes, K>(
                this as unknown as SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, K, TStoredDataKey>,
                updateFunc,
                makeLocalSettingGetter,
                makeGlobalSettingGetter
            );
            dependencies.push(dependency);

            dependency.subscribe((availableValues: AvailableValuesType<TSettingTypes[K]> | null) => {
                if (availableValues === null) {
                    this.setAvailableValues(settingKey, [] as unknown as AvailableValuesType<TSettingTypes[K]>);
                    return;
                }
                this.setAvailableValues(settingKey, availableValues);
            });

            dependency.subscribeLoading((loading: boolean, hasDependencies: boolean) => {
                this._settings[settingKey].setLoading(loading);

                const anyLoading = dependencies.some((dep) => dep.getIsLoading());

                if (!hasDependencies && !loading && !anyLoading) {
                    this.handleSettingChanged();
                }
            });

            dependency.initialize();

            return dependency;
        };

        const storedDataUpdater = <K extends TStoredDataKey>(
            key: K,
            updateFunc: UpdateFunc<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey>
        ): Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey> => {
            const dependency = new Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey>(
                this as unknown as SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TKey, K>,
                updateFunc,
                makeLocalSettingGetter,
                makeGlobalSettingGetter
            );
            dependencies.push(dependency);

            dependency.subscribe((storedData: TStoredData[K] | null) => {
                this.setStoredData(key, storedData);
            });

            dependency.initialize();

            return dependency;
        };

        const helperDependency = <T>(
            update: (args: {
                getLocalSetting: <T extends TKey>(settingName: T) => TSettingTypes[T];
                getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
                getHelperDependency: <TDep>(dep: Dependency<TDep, TSettings, TSettingTypes, TKey>) => TDep | null;
                abortSignal: AbortSignal;
            }) => T
        ) => {
            const dependency = new Dependency<T, TSettings, TSettingTypes, TKey>(
                this as unknown as SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TKey, TStoredDataKey>,
                update,
                makeLocalSettingGetter,
                makeGlobalSettingGetter
            );
            dependencies.push(dependency);

            dependency.initialize();

            return dependency;
        };

        if (this._customSettingsHandler.defineDependencies) {
            this._customSettingsHandler.defineDependencies({
                availableSettingsUpdater,
                storedDataUpdater,
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

    private setLoadingState(loadingState: SettingsContextLoadingState) {
        if (this._loadingState === loadingState) {
            return;
        }

        this._loadingState = loadingState;
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.LOADING_STATE_CHANGED);
    }

    private handleSettingChanged() {
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
            if (this._settings[key].isLoading()) {
                this.setLoadingState(SettingsContextLoadingState.LOADING);
                return;
            }
        }

        this.setLoadingState(SettingsContextLoadingState.LOADED);
    }
}
