import type { PublishSubscribe } from "../../utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "../../utils/PublishSubscribeDelegate";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
    type GlobalSettings,
} from "../framework/DataProviderManager/DataProviderManager";
import type { SettingManager } from "../framework/SettingManager/SettingManager";
import { SettingTopic } from "../framework/SettingManager/SettingManager";
import type { CustomSettingsHandler, SettingAttributes, UpdateFunc } from "../interfacesAndTypes/customSettingsHandler";
import type { SerializedSettingsState } from "../interfacesAndTypes/serialization";
import type { NullableStoredData, StoredData } from "../interfacesAndTypes/sharedTypes";
import type { AvailableValuesType, SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, SettingTypes, Settings } from "../settings/settingsDefinitions";

import { Dependency } from "./_utils/Dependency";
import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

export enum SettingsContextStatus {
    VALID_SETTINGS = "VALID_SETTINGS",
    LOADING = "LOADING",
    INVALID_SETTINGS = "INVALID_SETTINGS",
}

export enum SettingsContextDelegateTopic {
    SETTINGS_AND_STORED_DATA_CHANGED = "SETTINGS_AND_STORED_DATA_CHANGED",
    STATUS = "STATUS",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED]: void;
    [SettingsContextDelegateTopic.STATUS]: SettingsContextStatus;
};

export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (oldValues: { [K in TKey]: TSettings[K] }, newValues: { [K in TKey]: TSettings[K] }): void;
}

export type SettingsContextDelegateState<TSettings extends Settings, TKey extends keyof TSettings> = {
    values: { [K in TKey]: TSettings[K] };
};

/*
 * The SettingsContextDelegate class is responsible for giving the settings of a data provider a common context as
 * many settings are interdependent.
 *
 * It creates a dependency graph for all settings and implements dependencies between both themselves and global settings.
 * It also takes care of notifying its subscribers (e.g. the respective data provider) when the settings change.
 *
 */
export class SettingsContextDelegate<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TStoredData extends StoredData = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> implements PublishSubscribe<SettingsContextDelegatePayloads>
{
    private _customSettingsHandler: CustomSettingsHandler<
        TSettings,
        TStoredData,
        TSettingTypes,
        TSettingKey,
        TStoredDataKey
    >;
    private _dataProviderManager: DataProviderManager;
    private _settings: { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } = {} as {
        [K in TSettingKey]: SettingManager<K, SettingTypes[K]>;
    };
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingsContextDelegatePayloads>();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _status: SettingsContextStatus = SettingsContextStatus.LOADING;
    private _storedData: NullableStoredData<TStoredData> = {} as NullableStoredData<TStoredData>;
    private _storedDataLoadingStatus: { [K in TStoredDataKey]: boolean } = {} as {
        [K in TStoredDataKey]: boolean;
    };
    private _dependencies: Dependency<any, TSettings, any, any>[] = [];

    constructor(
        customSettingsHandler: CustomSettingsHandler<
            TSettings,
            TStoredData,
            TSettingTypes,
            TSettingKey,
            TStoredDataKey
        >,
        dataProviderManager: DataProviderManager,
        settings: { [K in TSettingKey]: SettingManager<K> },
    ) {
        this._customSettingsHandler = customSettingsHandler;
        this._dataProviderManager = dataProviderManager;

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "dependencies",
            this.getDataProviderManager()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.GLOBAL_SETTINGS)(() => {
                this.handleSettingChanged();
            }),
        );

        for (const key in settings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(() => {
                    this.handleSettingChanged();
                }),
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "settings",
                settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_LOADING)(() => {
                    this.handleSettingsLoadingStateChanged();
                }),
            );
        }

        this._settings = settings;

        this.createDependencies();
    }

    getDataProviderManager(): DataProviderManager {
        return this._dataProviderManager;
    }

    getStatus(): SettingsContextStatus {
        return this._status;
    }

    getValues(): { [K in TSettingKey]?: TSettingTypes[K] } {
        const settings: { [K in TSettingKey]?: TSettingTypes[K] } = {} as {
            [K in TSettingKey]?: TSettingTypes[K];
        };
        for (const key in this._settings) {
            if (this._settings[key].isPersistedValue()) {
                settings[key] = undefined;
                continue;
            }
            settings[key] = this._settings[key].getValue() as any;
        }

        return settings;
    }

    areCurrentSettingsValid(): boolean {
        for (const key in this._settings) {
            if (!this._settings[key].isValueValid()) {
                return false;
            }
        }

        return true;
    }

    areAllDependenciesLoaded(): boolean {
        for (const dependency of this._dependencies) {
            if (dependency.getIsLoading()) {
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

    isAllStoredDataLoaded(): boolean {
        for (const key in this._storedDataLoadingStatus) {
            if (this._storedDataLoadingStatus[key]) {
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

    setAvailableValues<K extends TSettingKey>(key: K, availableValues: AvailableValuesType<K>): void {
        const settingDelegate = this._settings[key];
        settingDelegate.setAvailableValues(availableValues);
    }

    setStoredData<K extends TStoredDataKey>(key: K, data: TStoredData[K] | null): void {
        this._storedData[key] = data;
        this._storedDataLoadingStatus[key] = false;

        this.handleSettingChanged();
    }

    getSettings() {
        return this._settings;
    }

    getStoredDataRecord(): NullableStoredData<TStoredData> {
        return this._storedData;
    }

    getStoredData(key: TStoredDataKey): TStoredData[TStoredDataKey] | null {
        return this._storedData[key];
    }

    makeSnapshotGetter<T extends SettingsContextDelegateTopic>(topic: T): () => SettingsContextDelegatePayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.STATUS) {
                return this._status;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SettingsContextDelegatePayloads> {
        return this._publishSubscribeDelegate;
    }

    serializeSettings(): SerializedSettingsState<TSettings, TSettingKey> {
        const serializedSettings: SerializedSettingsState<TSettings, TSettingKey> = {} as SerializedSettingsState<
            TSettings,
            TSettingKey
        >;
        for (const key in this._settings) {
            serializedSettings[key] = this._settings[key].serializeValue();
        }
        return serializedSettings;
    }

    deserializeSettings(serializedSettings: SerializedSettingsState<TSettings, TSettingKey>): void {
        for (const [key, value] of Object.entries(serializedSettings)) {
            const settingDelegate = this._settings[key as TSettingKey];
            settingDelegate.deserializeValue(value as string);
            if (settingDelegate.isStatic()) {
                settingDelegate.maybeResetPersistedValue();
                settingDelegate.initialize();
            }
        }
    }

    createDependencies(): void {
        this._unsubscribeHandler.unsubscribe("dependencies");

        this._dependencies = [];

        const makeLocalSettingGetter = <K extends TSettingKey>(key: K, handler: (value: TSettingTypes[K]) => void) => {
            const handleChange = (): void => {
                const setting = this._settings[key];
                handler(setting.getValue() as unknown as TSettingTypes[K]);
            };
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                    handleChange,
                ),
            );

            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_LOADING)(
                    () => {
                        if (!this._settings[key].isLoading()) {
                            handleChange();
                        }
                    },
                ),
            );

            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_PERSISTED)(
                    handleChange,
                ),
            );

            return handleChange;
        };

        const makeGlobalSettingGetter = <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K]) => void,
        ) => {
            const handleChange = (): void => {
                handler(this.getDataProviderManager.bind(this)().getGlobalSetting(key));
            };
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this.getDataProviderManager()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(DataProviderManagerTopic.GLOBAL_SETTINGS)(handleChange),
            );

            return handleChange;
        };

        const loadingStateGetter = <K extends TSettingKey>(settingKey: K): boolean => {
            return this._settings[settingKey].isLoading();
        };

        const localSettingManagerGetter = <K extends TSettingKey>(key: K): SettingManager<K> => {
            return this._settings[key];
        };

        const globalSettingGetter = <K extends keyof GlobalSettings>(key: K): GlobalSettings[K] => {
            return this.getDataProviderManager.bind(this)().getGlobalSetting(key);
        };

        const availableSettingsUpdater = <K extends TSettingKey>(
            settingKey: K,
            updateFunc: UpdateFunc<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey>(
                localSettingManagerGetter,
                globalSettingGetter,
                updateFunc,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
            );
            this._dependencies.push(dependency);

            dependency.subscribe((availableValues) => {
                if (availableValues === null) {
                    this.setAvailableValues(settingKey, [] as unknown as AvailableValuesType<K>);
                    return;
                }
                this.setAvailableValues(settingKey, availableValues);
                this.handleSettingChanged();
            });

            dependency.subscribeLoading((loading: boolean) => {
                if (loading) {
                    this._settings[settingKey].setLoading(loading);
                }
                this.handleSettingChanged();
            });

            dependency.initialize();

            return dependency;
        };

        const settingAttributesUpdater = <K extends TSettingKey>(
            settingKey: K,
            updateFunc: UpdateFunc<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey>(
                localSettingManagerGetter,
                globalSettingGetter,
                updateFunc,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
            );
            this._dependencies.push(dependency);

            dependency.subscribe((attributes: Partial<SettingAttributes> | null) => {
                if (attributes === null) {
                    return;
                }
                this._settings[settingKey].updateAttributes(attributes);
            });

            dependency.initialize();

            return dependency;
        };

        const storedDataUpdater = <K extends TStoredDataKey>(
            key: K,
            updateFunc: UpdateFunc<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<
                NullableStoredData<TStoredData>[K],
                TSettings,
                TSettingTypes,
                TSettingKey
            >(
                localSettingManagerGetter,
                globalSettingGetter,
                updateFunc,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
            );
            this._dependencies.push(dependency);

            dependency.subscribe((storedData: TStoredData[K] | null) => {
                this.setStoredData(key, storedData);
            });

            dependency.subscribeLoading((loading: boolean) => {
                if (loading) {
                    this._storedData[key] = null;
                    this._storedDataLoadingStatus[key] = loading;
                    this.handleSettingChanged();
                }
            });

            dependency.initialize();

            return dependency;
        };

        const helperDependency = <T>(
            update: (args: {
                getLocalSetting: <T extends TSettingKey>(settingName: T) => TSettingTypes[T];
                getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
                getHelperDependency: <TDep>(
                    dep: Dependency<TDep, TSettings, TSettingTypes, TSettingKey>,
                ) => TDep | null;
                abortSignal: AbortSignal;
            }) => T,
        ) => {
            const dependency = new Dependency<T, TSettings, TSettingTypes, TSettingKey>(
                localSettingManagerGetter,
                globalSettingGetter,
                update,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
            );
            this._dependencies.push(dependency);

            dependency.subscribeLoading(() => {
                this.handleSettingChanged();
            });

            dependency.initialize();

            return dependency;
        };

        if (this._customSettingsHandler.defineDependencies) {
            this._customSettingsHandler.defineDependencies({
                availableSettingsUpdater: availableSettingsUpdater.bind(this),
                settingAttributesUpdater: settingAttributesUpdater.bind(this),
                storedDataUpdater: storedDataUpdater.bind(this),
                helperDependency: helperDependency.bind(this),
                workbenchSession: this.getDataProviderManager().getWorkbenchSession(),
                workbenchSettings: this.getDataProviderManager().getWorkbenchSettings(),
                queryClient: this.getDataProviderManager().getQueryClient(),
            });
        }
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
        for (const dependency of this._dependencies) {
            dependency.beforeDestroy();
        }
        this._dependencies = [];
        for (const key in this._settings) {
            this._settings[key].beforeDestroy();
        }
        this._settings = {} as { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> };
    }

    private setStatus(status: SettingsContextStatus) {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.STATUS);
    }

    private handleSettingChanged() {
        if (!this.areAllSettingsLoaded() || !this.areAllDependenciesLoaded() || !this.isAllStoredDataLoaded()) {
            this.setStatus(SettingsContextStatus.LOADING);
            return;
        }

        if (
            this.isSomePersistedSettingNotValid() ||
            !this.areCurrentSettingsValid() ||
            !this.areAllSettingsInitialized()
        ) {
            this.setStatus(SettingsContextStatus.INVALID_SETTINGS);
            return;
        }

        this.setStatus(SettingsContextStatus.VALID_SETTINGS);
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED);
    }

    private handleSettingsLoadingStateChanged() {
        if (!this.areAllSettingsLoaded() || !this.areAllDependenciesLoaded() || !this.areAllSettingsInitialized()) {
            this.setStatus(SettingsContextStatus.LOADING);
            return;
        }

        this.handleSettingChanged();
    }
}
