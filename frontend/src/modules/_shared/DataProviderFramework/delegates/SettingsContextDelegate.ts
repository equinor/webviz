import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";
import { Dependency } from "./_utils/Dependency";

import type { PublishSubscribe } from "../../utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "../../utils/PublishSubscribeDelegate";
import type { DataProvider } from "../framework/DataProvider/DataProvider";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
    type GlobalSettings,
} from "../framework/DataProviderManager/DataProviderManager";
import { Group } from "../framework/Group/Group";
import type { SettingManager } from "../framework/SettingManager/SettingManager";
import { SettingTopic } from "../framework/SettingManager/SettingManager";
import { SharedSetting } from "../framework/SharedSetting/SharedSetting";
import type { CustomSettingsHandler, UpdateFunc } from "../interfacesAndTypes/customSettingsHandler";
import { type SharedSettingsProvider, instanceofSharedSettingsProvider } from "../interfacesAndTypes/entities";
import type { SerializedSettingsState } from "../interfacesAndTypes/serialization";
import type { NullableStoredData, StoredData } from "../interfacesAndTypes/sharedTypes";
import type { AvailableValuesType, SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, SettingTypes, Settings } from "../settings/settingsDefinitions";

export enum SettingsContextStatus {
    VALID_SETTINGS = "VALID_SETTINGS",
    LOADING = "LOADING",
    INVALID_SETTINGS = "INVALID_SETTINGS",
}

export enum SettingsContextDelegateTopic {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    STORED_DATA_CHANGED = "STORED_DATA_CHANGED",
    STATUS = "LOADING_STATE_CHANGED",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.STORED_DATA_CHANGED]: void;
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
 * It also takes care of overriding settings that are set by shared settings.
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
    private _owner: DataProvider<TSettings, any, TStoredData, TSettingTypes, TSettingKey>;
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

    constructor(
        owner: DataProvider<TSettings, any, TStoredData, TSettingTypes, TSettingKey>,
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
        this._owner = owner;
        this._customSettingsHandler = customSettingsHandler;
        this._dataProviderManager = dataProviderManager;

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
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "data-provider-manager",
                dataProviderManager
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(DataProviderManagerTopic.SHARED_SETTINGS_CHANGED)(() => {
                    this.handleSharedSettingsChanged();
                }),
            );

            this._unsubscribeHandler.registerUnsubscribeFunction(
                "data-provider-manager",
                dataProviderManager
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(DataProviderManagerTopic.ITEMS)(() => {
                    this.handleSharedSettingsChanged();
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

    handleSharedSettingsChanged() {
        const parentGroup = this._owner.getItemDelegate().getParentGroup();
        if (!parentGroup) {
            return;
        }

        const sharedSettingsProviders: SharedSettingsProvider[] = parentGroup.getAncestorAndSiblingItems(
            (item) => item instanceof SharedSetting,
        ) as unknown as SharedSettingsProvider[];

        const ancestorGroups: SharedSettingsProvider[] = parentGroup.getAncestors(
            (item) => item instanceof Group && instanceofSharedSettingsProvider(item),
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

    setAvailableValues<K extends TSettingKey>(key: K, availableValues: AvailableValuesType<K>): void {
        const settingDelegate = this._settings[key];
        settingDelegate.setAvailableValues(availableValues);

        this.getDataProviderManager().publishTopic(DataProviderManagerTopic.AVAILABLE_SETTINGS_CHANGED);
    }

    setStoredData<K extends keyof TStoredData>(key: K, data: TStoredData[K] | null): void {
        this._storedData[key] = data;
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.STORED_DATA_CHANGED);
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
            if (topic === SettingsContextDelegateTopic.STORED_DATA_CHANGED) {
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

        const dependencies: Dependency<any, TSettings, any, any>[] = [];

        const makeLocalSettingGetter = <K extends TSettingKey>(key: K, handler: (value: TSettingTypes[K]) => void) => {
            const handleChange = (): void => {
                handler(this._settings[key].getValue() as unknown as TSettingTypes[K]);
            };
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "dependencies",
                this._settings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                    handleChange,
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

        const availableSettingsUpdater = <K extends TSettingKey>(
            settingKey: K,
            updateFunc: UpdateFunc<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<AvailableValuesType<K>, TSettings, TSettingTypes, TSettingKey>(
                this,
                updateFunc,
                makeLocalSettingGetter,
                makeGlobalSettingGetter,
            );
            dependencies.push(dependency);

            dependency.subscribe((availableValues) => {
                if (availableValues === null) {
                    this.setAvailableValues(settingKey, [] as unknown as AvailableValuesType<K>);
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
            updateFunc: UpdateFunc<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<
                NullableStoredData<TStoredData>[K],
                TSettings,
                TSettingTypes,
                TSettingKey
            >(this, updateFunc, makeLocalSettingGetter, makeGlobalSettingGetter);
            dependencies.push(dependency);

            dependency.subscribe((storedData: TStoredData[K] | null) => {
                this.setStoredData(key, storedData);
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
                this,
                update,
                makeLocalSettingGetter,
                makeGlobalSettingGetter,
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
                workbenchSession: this.getDataProviderManager().getWorkbenchSession(),
                workbenchSettings: this.getDataProviderManager().getWorkbenchSettings(),
                queryClient: this.getDataProviderManager().getQueryClient(),
            });
        }
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }

    private setStatus(status: SettingsContextStatus) {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.STATUS);
    }

    private handleSettingChanged() {
        if (!this.areAllSettingsLoaded() || !this.areAllSettingsInitialized()) {
            this.setStatus(SettingsContextStatus.LOADING);
            return;
        }

        if (this.isSomePersistedSettingNotValid() || !this.areCurrentSettingsValid()) {
            this.setStatus(SettingsContextStatus.INVALID_SETTINGS);
            return;
        }

        this.setStatus(SettingsContextStatus.VALID_SETTINGS);
        this._publishSubscribeDelegate.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);
    }

    private handleSettingsLoadingStateChanged() {
        for (const key in this._settings) {
            if (this._settings[key].isLoading()) {
                this.setStatus(SettingsContextStatus.LOADING);
                return;
            }
        }

        this.handleSettingChanged();
    }
}
