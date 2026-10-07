import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";
import { isCancelledError } from "@tanstack/react-query";
import { clone, isEqual } from "lodash-es";

import { GenericStatusMessageStore } from "@framework/GenericStatusMessageStore";
import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { StatusMessageStoreTopic, type StatusMessage as GenericStatusMessage } from "@framework/types/statusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { ItemDelegate } from "../../delegates/ItemDelegate";
import {
    SettingsContextDelegate,
    SettingsContextDelegateTopic,
    SettingsContextStatus,
} from "../../delegates/SettingsContextDelegate";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { Item } from "../../interfacesAndTypes/entities";
import { type SerializedDataProvider, SerializedType } from "../../interfacesAndTypes/serialization";
import type { NullableStoredData, StoredData } from "../../interfacesAndTypes/sharedTypes";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { Settings } from "../../settings/settingsDefinitions";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { makeSettings } from "../utils/makeSettings";

export enum DataProviderTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
    REVISION_NUMBER = "REVISION_NUMBER",
    PROGRESS_MESSAGE = "PROGRESS_MESSAGE",
    STATUS_MESSAGES = "STATUS_MESSAGES",
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
    [DataProviderTopic.STATUS_MESSAGES]: readonly GenericStatusMessage[];
};

// Using a unique brand to identify DataProvider objects, since instanceof checks won't work due to potential multiple versions of the module.
// Using Symbol.for to ensure that even if there are multiple versions of the module, they will all reference the same symbol for the brand.
const DATA_PROVIDER_BRAND = Symbol.for("dpf/data-provider");

export function isDataProvider(obj: any): obj is DataProvider<any, any> {
    return typeof obj === "object" && obj !== null && DATA_PROVIDER_BRAND in obj;
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
    private readonly [DATA_PROVIDER_BRAND] = true;

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
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DataProviderPayloads<TData>>();
    private _status: DataProviderStatus = DataProviderStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _valueRange: readonly [number, number] | null = null;
    private _isSubordinated: boolean = false;
    private _prevSettings: TSettingTypes | null = null;
    private _prevStoredData: NullableStoredData<TStoredData> | null = null;
    private _currentTransactionId: number = 0;
    private _revisionNumber: number = 0;
    private _progressMessage: string | null = null;
    private _scopedQueryController: ScopedQueryController;
    private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _onFetchCancelOrFinishFn: () => void = () => {};
    // The outcome of the last fetch - applied right away, or held back while the settings were loading again, as whether
    // it is still current is only known once they have resolved. Restored when the settings turn out unchanged (see
    // handleSettingsAndStoredDataChange). Held back data is kept in heldBackData rather than in _data, so it only becomes
    // visible once accepted - and only until then, so it's never kept twice. heldBackData is checked by presence, as the
    // data itself may be null or undefined.
    private _lastFetchOutcome:
        | { type: "data"; heldBackData?: TData }
        | { type: "error"; error: StatusMessage | string | null }
        | null = null;
    private _isDestroyed: boolean = false;

    private _statusWriter = new GenericStatusMessageStore("DataProvider");
    private _allStatusMessages: GenericStatusMessage[] = [];

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
        this._scopedQueryController = new ScopedQueryController(params.dataProviderManager.getQueryClient());
        this._customDataProviderImpl = customDataProviderImplementation;
        this._itemDelegate = new ItemDelegate(
            instanceName ?? customDataProviderImplementation.getDefaultName(),
            1,
            dataProviderManager,
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "status-writer",
            this._statusWriter
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(StatusMessageStoreTopic.STATUS_MESSAGES)(() => this.syncAllStatusMessages()),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.STATUS_MESSAGES)(() => {
                this.syncAllStatusMessages();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED)(() => {
                this.handleSettingsAndStoredDataChange();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.STATUS)(() => {
                this.handleSettingsStatusChange();
            }),
        );

        // The settings context starts out LOADING without publishing it - start out in sync with it, so the first
        // loading phase is shown too. Set directly instead of through setStatus(), as there is nothing to notify yet.
        if (this._settingsContextDelegate.getStatus() === SettingsContextStatus.LOADING) {
            this._status = DataProviderStatus.LOADING;
        }

        this._settingsContextDelegate.evaluateIfWithoutDependencies();
    }

    getRevisionNumber(): number {
        return this._revisionNumber;
    }

    areCurrentSettingsValid(): boolean {
        if (!this._customDataProviderImpl.areCurrentSettingsValid) {
            return true;
        }

        return this._customDataProviderImpl.areCurrentSettingsValid(this.makeAccessors());
    }

    private handleSettingsAndStoredDataChange(): void {
        this._statusWriter.clear();

        if (this._settingsContextDelegate.getStatus() === SettingsContextStatus.LOADING) {
            this.setStatus(DataProviderStatus.LOADING);
            return;
        }

        // Any fetch scheduled or running was for other settings - cancelled before anything else is decided, so it can't
        // replace the outcome: neither INVALID_SETTINGS by the provider's own rule, nor the current data when no refetch
        // turns out to be required, as the settings are then back to those of the current data
        this.cancelScheduledAndActiveFetch();

        if (!this.areCurrentSettingsValid()) {
            this.discardOutdatedData();
            this._error = "Invalid settings";
            this.setStatus(DataProviderStatus.INVALID_SETTINGS);
            return;
        }

        let refetchRequired;

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
            // The settings are those of the last fetch - restore its outcome, which may have been held back while they
            // were loading again, or replaced by LOADING meanwhile. A failed fetch must not turn into SUCCESS.
            const lastFetchOutcome = this._lastFetchOutcome;
            if (lastFetchOutcome?.type === "error") {
                this._error = lastFetchOutcome.error;
                this.setStatus(DataProviderStatus.ERROR);
                return;
            }
            if (lastFetchOutcome?.type === "data" && "heldBackData" in lastFetchOutcome) {
                const data = lastFetchOutcome.heldBackData as TData;
                this._lastFetchOutcome = { type: "data" };
                this.applyFetchedData(data);
                this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.DATA);
            }
            // If the settings have changed but no refetch is required, it might be that the settings changes
            // still require a rerender of the data provider.
            if (this._status === DataProviderStatus.SUCCESS) {
                this.incrementRevisionNumber();
                return;
            }
            this.setStatus(DataProviderStatus.SUCCESS);
            return;
        }

        this._currentTransactionId += 1;
        const localTransactionId = this._currentTransactionId;

        // ! The status deliberately stays as it is until the debounced fetch starts. Setting LOADING here already made
        // ! visualizations get built from the outdated data a moment earlier, and some layers process their data
        // ! asynchronously without discarding outdated results (e.g. subsurface-viewer's MapLayer) - the outdated mesh
        // ! could finish last and replace the new one.

        // Debounce the refetch to avoid multiple refetches in a short time span. Until it starts, the provider is
        // pending through isFetchScheduled(), so e.g. a restore can't finish in between.
        const timeout = setTimeout(() => {
            if (this._currentTransactionId !== localTransactionId) {
                // If the transaction id has changed, it means that a new transaction has started while the
                // previous one was still running. In this case, we do not refetch the data
                return;
            }
            // Recorded now, as the settings may change while fetching - the data belongs to the ones it was fetched with
            const fetchedSettings = clone(this._settingsContextDelegate.getValues()) as TSettingTypes;
            const fetchedStoredData = clone(this._settingsContextDelegate.getStoredDataRecord()) as TStoredData;
            this.maybeRefetchData().then(() => {
                if (this._currentTransactionId === localTransactionId) {
                    this._prevSettings = fetchedSettings;
                    this._prevStoredData = fetchedStoredData;
                }
            });
            // Only cleared now that the fetch has started, which sets LOADING synchronously - so there is no moment in
            // between where the provider looks settled
            if (this._debounceTimeout === timeout) {
                this.setScheduledFetch(null);
            }
        }, 10);
        this.setScheduledFetch(timeout);
    }

    private handleSettingsStatusChange(): void {
        const status = this._settingsContextDelegate.getStatus();
        if (status === SettingsContextStatus.INVALID_SETTINGS) {
            // A fetch scheduled or started while the settings were still valid would otherwise replace this status
            // once it finishes
            this.cancelScheduledAndActiveFetch();
            this.discardOutdatedData();
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

    getDataValueRange(): readonly [number, number] | null {
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
            if (topic === DataProviderTopic.STATUS_MESSAGES) {
                return this._allStatusMessages;
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

    makeAccessors(): DataProviderAccessors<TSettings, TData, TStoredData, TSettingKey> {
        return {
            getSetting: (settingName) => this._settingsContextDelegate.getSettings()[settingName].getValue(),
            getSettingValueConstraints: (settingName) =>
                this._settingsContextDelegate.getSettings()[settingName].getValueConstraints(),
            getGlobalSetting: (settingName) => this._dataProviderManager.getGlobalSetting(settingName),
            getStoredData: (key: keyof TStoredData) => this._settingsContextDelegate.getStoredData(key),
            getData: () => this._data,
            getWorkbenchSession: () => this._dataProviderManager.getWorkbenchSession(),
            getWorkbenchSettings: () => this._dataProviderManager.getWorkbenchSettings(),
            getStatusWriter: () => this._statusWriter,
        };
    }

    private tidyUpFetchRelatedResources(): void {
        // Cancel any resources related to the last ongoing fetch.
        this._scopedQueryController.cancelActiveFetch();
        this._onFetchCancelOrFinishFn();
        this._onFetchCancelOrFinishFn = () => {};
    }

    /*
     * Invalid settings make the current data outdated, and it isn't shown anyway. Keeping it would get it shown again
     * once the provider loads anew - e.g. a surface of the previous field after a field change - and replacing it a
     * moment later races the layer's asynchronous processing of the old data against the new one.
     * The settings of the last fetch are forgotten with it, so becoming valid again always fetches.
     */
    private discardOutdatedData(): void {
        this._data = null;
        this._valueRange = null;
        this._lastFetchOutcome = null;
        this._prevSettings = null;
        this._prevStoredData = null;
    }

    /*
     * Whether a refetch is scheduled but hasn't started yet. The provider is pending then (e.g. for the restore readiness
     * check), although its status only changes once the fetch starts - see handleSettingsAndStoredDataChange.
     */
    isFetchScheduled(): boolean {
        return this._debounceTimeout !== null;
    }

    // Replaces the scheduled refetch. A change of whether one is scheduled is published on the status topic, as it
    // changes whether the provider is pending without changing its status.
    private setScheduledFetch(timeout: ReturnType<typeof setTimeout> | null): void {
        const wasScheduled = this._debounceTimeout !== null;
        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
        }
        this._debounceTimeout = timeout;
        if (wasScheduled !== (timeout !== null)) {
            this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS);
        }
    }

    // Makes fetched data the provider's current data
    private applyFetchedData(data: TData): void {
        this._data = data;
        this._valueRange = this._customDataProviderImpl.makeValueRange?.(this.makeAccessors()) ?? null;
    }

    private cancelScheduledAndActiveFetch(): void {
        // A fetch that is already past its queries only applies its result while its transaction is the current one
        this._currentTransactionId += 1;
        this.setScheduledFetch(null);
        this.tidyUpFetchRelatedResources();
    }

    private async maybeRefetchData(): Promise<void> {
        const thisTransactionId = this._currentTransactionId;

        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._isSubordinated) {
            return;
        }

        const accessors = this.makeAccessors();

        this.invalidateValueRange();
        this.setProgressMessage(null);
        this.setStatus(DataProviderStatus.LOADING);

        // A fetch is superseded once the transaction id changes - by a newer fetch, a cancellation or destroying the
        // provider. Its queries are cancelled then, but anything else it does may still finish, so everything it does
        // afterwards is checked against this.
        const isCurrent = () => this._currentTransactionId === thisTransactionId;

        const onFetchCancelOrFinish = (fnc: () => void) => {
            if (!isCurrent()) {
                // Registered too late to be called by the cancellation - clean up right away instead
                fnc();
                return;
            }
            this._onFetchCancelOrFinishFn = fnc;
        };

        try {
            const data = await this._customDataProviderImpl.fetchData({
                ...accessors,
                fetchQuery: <TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
                    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
                ) => this._scopedQueryController.fetchQuery<TQueryFnData, TError, TData, TQueryKey>(options),
                onFetchCancelOrFinish,
                setProgressMessage: (message) => {
                    if (isCurrent()) {
                        this.setProgressMessage(message);
                    }
                },
            });

            if (!isCurrent()) {
                return;
            }

            // The settings started loading again while fetching - the provider stays LOADING and the data is held back,
            // outside of the current data, until they have resolved (see _lastFetchOutcome)
            if (this._settingsContextDelegate.getStatus() === SettingsContextStatus.LOADING) {
                this._lastFetchOutcome = { type: "data", heldBackData: data };
                return;
            }

            this._lastFetchOutcome = { type: "data" };

            this.applyFetchedData(data);

            this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.DATA);
            this.setStatus(DataProviderStatus.SUCCESS);
        } catch (error: any) {
            // A superseded fetch may fail with anything once its work is cut off, not only a cancelled error
            if (isCancelledError(error) || !isCurrent()) {
                return;
            }

            // Like data, a failure while the settings are loading again is held back - an ERROR would count as settled
            // and could end a restore before the settings have resolved
            const errorMessage = makeFetchErrorMessage(error);
            this._lastFetchOutcome = { type: "error", error: errorMessage };
            if (this._settingsContextDelegate.getStatus() === SettingsContextStatus.LOADING) {
                return;
            }

            this._error = errorMessage;
            this.setStatus(DataProviderStatus.ERROR);
        } finally {
            // A superseded fetch was cleaned up when it was cancelled - what is registered now belongs to a newer one
            if (isCurrent()) {
                this._onFetchCancelOrFinishFn();
                this._onFetchCancelOrFinishFn = () => {};
                this.setProgressMessage(null);
            }
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
        const reportError = (errorMsg: string) => {
            this.getItemDelegate().reportDeserializationError(errorMsg);
        };
        this._settingsContextDelegate.deserializeSettings(serializedDataProvider.settings, reportError);
    }

    beforeDestroy(): void {
        this._isDestroyed = true;
        // Supersedes a fetch in flight too, so nothing it does afterwards reaches this provider
        this.cancelScheduledAndActiveFetch();
        this._settingsContextDelegate.beforeDestroy();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    private incrementRevisionNumber(): void {
        // A destroyed provider is no longer part of the manager's tree, so it must not publish GUI state revisions for it
        if (this._isDestroyed) {
            return;
        }
        this._revisionNumber += 1;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.REVISION_NUMBER);
        this._dataProviderManager.increaseGuiStateRevisionNumber();
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

    private syncAllStatusMessages(): void {
        const localMessages = this._statusWriter.getMessages();
        const settingsContextMessages = this._settingsContextDelegate.getStatusMessages();

        this._allStatusMessages = [...localMessages, ...settingsContextMessages];

        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS_MESSAGES);
    }
}

function makeFetchErrorMessage(error: any): StatusMessage | string | null {
    const apiError = ApiErrorHelper.fromError(error);
    if (apiError) {
        return apiError.makeStatusMessage();
    }
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return null;
}
