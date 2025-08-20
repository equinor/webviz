import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";
import { isCancelledError } from "@tanstack/react-query";
import { clone, isEqual } from "lodash";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";

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
import type { NullableStoredData, StoredData } from "../../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, Settings } from "../../settings/settingsDefinitions";
import { type DataProviderManager, DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import { makeSettings } from "../utils/makeSettings";

export enum DataProviderTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
    REVISION_NUMBER = "REVISION_NUMBER",
    PROGRESS_MESSAGE = "PROGRESS_MESSAGE",
}

export enum DataProviderStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    INVALID_SETTINGS = "INVALID_SETTINGS",
    SUCCESS = "SUCCESS",
}

export type DataProviderPayloads<TData> = {
    [DataProviderTopic.STATUS]: DataProviderStatus;
    [DataProviderTopic.DATA]: TData;
    [DataProviderTopic.SUBORDINATED]: boolean;
    [DataProviderTopic.REVISION_NUMBER]: number;
    [DataProviderTopic.PROGRESS_MESSAGE]: string | null;
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
    implements Item, PublishSubscribe<DataProviderPayloads<TData>>
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
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DataProviderPayloads<TData>>();
    private _status: DataProviderStatus = DataProviderStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _valueRange: readonly [number, number] | null = null;
    private _isSubordinated: boolean = false;
    private _prevSettings: TSettingTypes | null = null;
    private _prevStoredData: NullableStoredData<TStoredData> | null = null;
    private _currentTransactionId: number = 0;
    private _settingsErrorMessages: string[] = [];
    private _revisionNumber: number = 0;
    private _progressMessage: string | null = null;
    private _queryRunner: ScopedQueryController;
    private _refetchScheduled: boolean = false;

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
            customDataProviderImplementation,
            dataProviderManager,
            makeSettings<TSettings, TSettingTypes, TSettingKey>(
                customDataProviderImplementation.settings,
                customDataProviderImplementation.getDefaultSettingsValues?.() ?? {},
            ),
        );
        this._queryRunner = new ScopedQueryController(params.dataProviderManager.getQueryClient());
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
                .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED)(() => {
                this.handleSettingsAndStoredDataChange();
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
    }

    areCurrentSettingsValid(): boolean {
        if (!this._customDataProviderImpl.areCurrentSettingsValid) {
            return true;
        }

        this._settingsErrorMessages = [];
        const reportError = (message: string) => {
            this._settingsErrorMessages.push(message);
        };
        return this._customDataProviderImpl.areCurrentSettingsValid({ ...this.makeAccessors(), reportError });
    }

    getSettingsErrorMessages(): string[] {
        return this._settingsErrorMessages;
    }

    handleSettingsAndStoredDataChange(): void {
        if (this._settingsContextDelegate.getStatus() === SettingsContextStatus.LOADING) {
            this.setStatus(DataProviderStatus.LOADING);
            return;
        }

        if (!this.areCurrentSettingsValid()) {
            this._error = "Invalid settings";
            this.setStatus(DataProviderStatus.INVALID_SETTINGS);
            return;
        }

        let refetchRequired = false;

        if (this._customDataProviderImpl.doSettingsChangesRequireDataRefetch) {
            refetchRequired = this._customDataProviderImpl.doSettingsChangesRequireDataRefetch(
                this._prevSettings,
                this._settingsContextDelegate.getValues() as TSettingTypes,
                this.makeAccessors(),
            );
        } else {
            refetchRequired = !isEqual(this._settingsContextDelegate.getValues(), this._prevSettings);
        }

        if (!refetchRequired) {
            if (this._customDataProviderImpl.doStoredDataChangesRequireDataRefetch) {
                refetchRequired = this._customDataProviderImpl.doStoredDataChangesRequireDataRefetch(
                    this._prevStoredData,
                    this._settingsContextDelegate.getStoredDataRecord(),
                    this.makeAccessors(),
                );
            } else {
                refetchRequired = !isEqual(this._settingsContextDelegate.getStoredDataRecord(), this._prevStoredData);
            }
        }

        if (!refetchRequired) {
            // If the settings have changed but no refetch is required, it might be that the settings changes
            // still require a rerender of the data provider.
            if (this._status === DataProviderStatus.SUCCESS) {
                this.incrementRevisionNumber();
                return;
            }
            this.setStatus(DataProviderStatus.SUCCESS);
            return;
        }

        if (this._refetchScheduled) return;
        this._refetchScheduled = true;

        // Coalesce to next macrotask
        setTimeout(() => {
            this.maybeRefetchData().then(() => {
                this._refetchScheduled = false;
                // It might be that we started a new transaction while the previous one was still running.
                // In this case, we need to make sure that we only use the latest transaction and cancel the previous one.
                this._currentTransactionId += 1;
                this._prevSettings = clone(this._settingsContextDelegate.getValues()) as TSettingTypes;
                this._prevStoredData = clone(this._settingsContextDelegate.getStoredDataRecord()) as TStoredData;
            });
        }, 0);
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

    getValueRange(): readonly [number, number] | null {
        return this._valueRange;
    }

    getDataProviderManager(): DataProviderManager {
        return this._dataProviderManager;
    }

    makeSnapshotGetter<T extends DataProviderTopic>(topic: T): () => DataProviderPayloads<TData>[T] {
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
            if (topic === DataProviderTopic.REVISION_NUMBER) {
                return this._revisionNumber;
            }
            if (topic === DataProviderTopic.PROGRESS_MESSAGE) {
                return this._progressMessage;
            }
            throw new Error(`Unknown topic: ${topic}`);
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DataProviderPayloads<TData>> {
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

    setProgressMessage(message: string | null): void {
        if (this._progressMessage === message) {
            return;
        }
        this._progressMessage = message;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.PROGRESS_MESSAGE);
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
        const thisTransactionId = this._currentTransactionId;

        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._isSubordinated) {
            return;
        }

        const accessors = this.makeAccessors();

        this._queryRunner.cancelActiveFetch();

        this.invalidateValueRange();
        this.setStatus(DataProviderStatus.LOADING);
        this.setProgressMessage(null);

        try {
            this._data = await this._customDataProviderImpl.fetchData({
                ...accessors,
                fetchQuery: <TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
                    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
                ) => this._queryRunner.run<TQueryFnData, TError, TData, TQueryKey>(options),
                setProgressMessage: (message) => this.setProgressMessage(message),
            });

            // This is a security check to make sure that we are not using a stale transaction id.
            // This can happen if the transaction id is incremented while the async fetch data function is still running.
            // Queries are cancelled in the maybeCancelQuery function and should, hence, throw a cancelled error.
            // However, there might me some operations following after the query execution that are not cancelled.
            if (this._currentTransactionId !== thisTransactionId) {
                return;
            }

            if (this._customDataProviderImpl.makeValueRange) {
                this._valueRange = this._customDataProviderImpl.makeValueRange(accessors);
            }
            this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.DATA);
            this.setStatus(DataProviderStatus.SUCCESS);
        } catch (error: any) {
            if (isCancelledError(error)) {
                return;
            }
            const apiError = ApiErrorHelper.fromError(error);
            if (apiError) {
                this._error = apiError.makeStatusMessage();
            } else {
                this._error = error.message;
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

    deserializeState(serializedDataProvider: SerializedDataProvider<TSettings, TSettingKey>): void {
        this.getItemDelegate().deserializeState(serializedDataProvider);
        this._settingsContextDelegate.deserializeSettings(serializedDataProvider.settings);
    }

    beforeDestroy(): void {
        this._settingsContextDelegate.beforeDestroy();
        this._unsubscribeHandler.unsubscribeAll();
        this._queryRunner.cancelActiveFetch();
    }

    private incrementRevisionNumber(): void {
        this._revisionNumber += 1;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.REVISION_NUMBER);
        this._dataProviderManager.publishTopic(DataProviderManagerTopic.DATA_REVISION);
    }

    private setStatus(status: DataProviderStatus): void {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this.incrementRevisionNumber();
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._dataProviderManager?.getQueryClient() ?? null;
    }

    private invalidateValueRange(): void {
        this._valueRange = null;
    }
}
