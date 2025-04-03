import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import type { PublishSubscribe } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";
import type { QueryClient } from "@tanstack/react-query";
import { isCancelledError } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { ItemDelegate } from "../../delegates/ItemDelegate";
import {
    SettingsContextDelegate,
    SettingsContextDelegateTopic,
    SettingsContextStatus,
} from "../../delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { Item } from "../../interfacesAndTypes/entities";
import { type SerializedDataProvider, SerializedType } from "../../interfacesAndTypes/serialization";
import type { StoredData } from "../../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, Settings } from "../../settings/settingsDefinitions";
import { type DataProviderManager, DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import { makeSettings } from "../utils/makeSettings";

export enum DataProviderTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
}

export enum DataProviderStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    INVALID_SETTINGS = "INVALID_SETTINGS",
    SUCCESS = "SUCCESS",
}

export type LayerDelegatePayloads<TData> = {
    [DataProviderTopic.STATUS]: DataProviderStatus;
    [DataProviderTopic.DATA]: TData;
    [DataProviderTopic.SUBORDINATED]: boolean;
};

export function isDataProvider(obj: any): obj is DataProvider<any, any> {
    if (!isDevMode()) {
        return obj instanceof DataProvider;
    }

    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    return (
        Boolean(obj.getType) &&
        Boolean(obj.getSettingsContextDelegate) &&
        Boolean(obj.getStatus) &&
        Boolean(obj.getData) &&
        Boolean(obj.getError)
    );
}

export type DataProviderParams<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> = {
    type: string;
    dataProviderManager: DataProviderManager;
    instanceName?: string;
    customDataProviderImplementation: CustomDataProviderImplementation<
        TSettings,
        TData,
        TStoredData,
        TSettingTypes,
        TSettingKey
    >;
};

/*
 * The DataProvider class is responsible for managing the state of a data provider.
 * It is responsible for (re-)fetching the data whenever changes to settings make it necessary.
 * It also manages the status of the provider (loading, success, error).
 */
export class DataProvider<
        TSettings extends Settings,
        TData,
        TStoredData extends StoredData = Record<string, never>,
        TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >
    implements Item, PublishSubscribe<LayerDelegatePayloads<TData>>
{
    private _type: string;
    private _customDataProviderImpl: CustomDataProviderImplementation<
        TSettings,
        TData,
        TStoredData,
        TSettingTypes,
        TSettingKey
    >;
    private _settingsContextDelegate: SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TSettingKey>;
    private _itemDelegate: ItemDelegate;
    private _dataProviderManager: DataProviderManager;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _cancellationPending: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayerDelegatePayloads<TData>>();
    private _queryKeys: unknown[][] = [];
    private _status: DataProviderStatus = DataProviderStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _valueRange: [number, number] | null = null;
    private _isSubordinated: boolean = false;
    private _prevSettings: TSettingTypes | null = null;

    constructor(params: DataProviderParams<TSettings, TData, TStoredData, TSettingTypes, TSettingKey>) {
        const {
            dataProviderManager: dataProviderManager,
            type,
            instanceName,
            customDataProviderImplementation,
        } = params;
        this._type = type;
        this._dataProviderManager = dataProviderManager;
        this._settingsContextDelegate = new SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TSettingKey>(
            this,
            customDataProviderImplementation,
            dataProviderManager,
            makeSettings<TSettings, TSettingTypes, TSettingKey>(
                customDataProviderImplementation.settings,
                customDataProviderImplementation.getDefaultSettingsValues?.() ?? {},
            ),
        );
        this._customDataProviderImpl = customDataProviderImplementation;
        this._itemDelegate = new ItemDelegate(
            instanceName ?? customDataProviderImplementation.getDefaultName(),
            1,
            dataProviderManager,
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
                this.handleSettingsChange();
            }),
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.STORED_DATA_CHANGED)(() => {
                this.handleSettingsChange();
            }),
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.STATUS)(() => {
                this.handleSettingsStatusChange();
            }),
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.GLOBAL_SETTINGS)(() => {
                this.handleSettingsChange();
            }),
        );
    }

    areCurrentSettingsValid(): boolean {
        if (!this._customDataProviderImpl.areCurrentSettingsValid) {
            return true;
        }

        return this._customDataProviderImpl.areCurrentSettingsValid(this.makeAccessors());
    }

    handleSettingsChange(): void {
        if (!this.areCurrentSettingsValid()) {
            this._error = "Invalid settings";
            this.setStatus(DataProviderStatus.INVALID_SETTINGS);
            return;
        }

        const refetchRequired =
            this._customDataProviderImpl.doSettingsChangesRequireDataRefetch?.(
                this._prevSettings,
                this._settingsContextDelegate.getValues() as TSettingTypes,
                this.makeAccessors(),
            ) ?? !isEqual(this._prevSettings, this._settingsContextDelegate.getValues() as TSettingTypes);

        if (!refetchRequired) {
            this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.DATA);
            this._dataProviderManager.publishTopic(DataProviderManagerTopic.DATA_REVISION);
            this.setStatus(DataProviderStatus.SUCCESS);
            return;
        }

        this._cancellationPending = true;
        this._prevSettings = this._settingsContextDelegate.getValues() as TSettingTypes;
        this.maybeCancelQuery().then(() => {
            this.maybeRefetchData();
        });
    }

    handleSettingsStatusChange(): void {
        const status = this._settingsContextDelegate.getStatus();
        if (status === SettingsContextStatus.INVALID_SETTINGS) {
            this._error = "Invalid settings";
            this.setStatus(DataProviderStatus.INVALID_SETTINGS);
            return;
        }
        if (status === SettingsContextStatus.LOADING) {
            this.setStatus(DataProviderStatus.LOADING);
            return;
        }
    }

    registerQueryKey(queryKey: unknown[]): void {
        this._queryKeys.push(queryKey);
    }

    getStatus(): DataProviderStatus {
        return this._status;
    }

    getData(): TData | null {
        return this._data;
    }

    getType(): string {
        return this._type;
    }

    getItemDelegate() {
        return this._itemDelegate;
    }

    getSettingsContextDelegate() {
        return this._settingsContextDelegate;
    }

    isSubordinated(): boolean {
        return this._isSubordinated;
    }

    setIsSubordinated(isSubordinated: boolean): void {
        if (this._isSubordinated === isSubordinated) {
            return;
        }
        this._isSubordinated = isSubordinated;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.SUBORDINATED);
    }

    getValueRange(): [number, number] | null {
        return this._valueRange;
    }

    getLayerManager(): DataProviderManager {
        return this._dataProviderManager;
    }

    makeSnapshotGetter<T extends DataProviderTopic>(topic: T): () => LayerDelegatePayloads<TData>[T] {
        const snapshotGetter = (): any => {
            if (topic === DataProviderTopic.STATUS) {
                return this._status;
            }
            if (topic === DataProviderTopic.DATA) {
                return this._data;
            }
            if (topic === DataProviderTopic.SUBORDINATED) {
                return this._isSubordinated;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<LayerDelegatePayloads<TData>> {
        return this._publishSubscribeDelegate;
    }

    getError(): StatusMessage | string | null {
        if (!this._error) {
            return null;
        }

        const name = this.getItemDelegate().getName();

        if (typeof this._error === "string") {
            return `${name}: ${this._error}`;
        }

        return {
            ...this._error,
            message: `${name}: ${this._error.message}`,
        };
    }

    makeAccessors(): DataProviderInformationAccessors<TSettings, TData, TStoredData, TSettingKey> {
        return {
            getSetting: (settingName) => this._settingsContextDelegate.getSettings()[settingName].getValue(),
            getAvailableSettingValues: (settingName) =>
                this._settingsContextDelegate.getSettings()[settingName].getAvailableValues(),
            getGlobalSetting: (settingName) => this._dataProviderManager.getGlobalSetting(settingName),
            getStoredData: (key: keyof TStoredData) => this._settingsContextDelegate.getStoredData(key),
            getData: () => this._data,
            getWorkbenchSession: () => this._dataProviderManager.getWorkbenchSession(),
            getWorkbenchSettings: () => this._dataProviderManager.getWorkbenchSettings(),
        };
    }

    async maybeRefetchData(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._cancellationPending) {
            return;
        }

        if (this._isSubordinated) {
            return;
        }

        const accessors = this.makeAccessors();

        this.invalidateValueRange();

        this.setStatus(DataProviderStatus.LOADING);

        try {
            this._data = await this._customDataProviderImpl.fetchData({
                ...accessors,
                queryClient,
                registerQueryKey: (key) => this.registerQueryKey(key),
            });
            if (this._customDataProviderImpl.makeValueRange) {
                this._valueRange = this._customDataProviderImpl.makeValueRange(accessors);
            }
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your custom provider implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour.",
                );
            }
            this._queryKeys = [];
            this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.DATA);
            this._dataProviderManager.publishTopic(DataProviderManagerTopic.DATA_REVISION);
            this.setStatus(DataProviderStatus.SUCCESS);
        } catch (error: any) {
            if (isCancelledError(error)) {
                return;
            }
            const apiError = ApiErrorHelper.fromError(error);
            if (apiError) {
                this._error = apiError.makeStatusMessage();
            } else {
                this._error = "An error occurred";
            }
            this.setStatus(DataProviderStatus.ERROR);
        }
    }

    serializeState(): SerializedDataProvider<TSettings, TSettingKey> {
        const itemState = this.getItemDelegate().serializeState();
        return {
            ...itemState,
            type: SerializedType.DATA_PROVIDER,
            dataProviderType: this._type,
            settings: this._settingsContextDelegate.serializeSettings(),
        };
    }

    deserializeState(serializedLayer: SerializedDataProvider<TSettings, TSettingKey>): void {
        this.getItemDelegate().deserializeState(serializedLayer);
        this._settingsContextDelegate.deserializeSettings(serializedLayer.settings);
    }

    beforeDestroy(): void {
        this._settingsContextDelegate.beforeDestroy();
        this._unsubscribeHandler.unsubscribeAll();
    }

    private setStatus(status: DataProviderStatus): void {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this._dataProviderManager.publishTopic(DataProviderManagerTopic.DATA_REVISION);
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._dataProviderManager?.getQueryClient() ?? null;
    }

    private invalidateValueRange(): void {
        this._valueRange = null;
    }

    private async maybeCancelQuery(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._queryKeys.length > 0) {
            for (const queryKey of this._queryKeys) {
                await queryClient.cancelQueries(
                    {
                        queryKey,
                    },
                    {
                        silent: true,
                        revert: true,
                    },
                );
                await queryClient.invalidateQueries({ queryKey });
                queryClient.removeQueries({ queryKey });
            }
            this._queryKeys = [];
        }

        this._cancellationPending = false;
    }
}
