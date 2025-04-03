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
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
} from "../../interfacesAndTypes/customDataLayerImplementation";
import type { Item } from "../../interfacesAndTypes/entities";
import type { SerializedDataLayer } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import type { StoredData } from "../../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, Settings } from "../../settings/settingsDefinitions";
import type { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { LayerManagerTopic } from "../DataLayerManager/DataLayerManager";
import { makeSettings } from "../utils/makeSettings";

export enum LayerDelegateTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
}

export enum DataLayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    INVALID_SETTINGS = "INVALID_SETTINGS",
    SUCCESS = "SUCCESS",
}

export type LayerDelegatePayloads<TData> = {
    [LayerDelegateTopic.STATUS]: DataLayerStatus;
    [LayerDelegateTopic.DATA]: TData;
    [LayerDelegateTopic.SUBORDINATED]: boolean;
};

export function isDataLayer(object: any): object is DataLayer<any, any> {
    if (!isDevMode()) {
        return object instanceof DataLayer;
    }

    if (typeof object !== "object" || object === null) {
        return false;
    }

    if (object.constructor.name !== "DataLayer") {
        return false;
    }

    const dataLayer: DataLayer<any, any> = object as DataLayer<any, any>;

    return (
        Object.hasOwn(dataLayer, "getType") &&
        Object.hasOwn(dataLayer, "getSettingsContextDelegate") &&
        Object.hasOwn(dataLayer, "getStatus") &&
        Object.hasOwn(dataLayer, "getData") &&
        Object.hasOwn(dataLayer, "getError")
    );
}

export type DataLayerParams<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> = {
    type: string;
    layerManager: DataLayerManager;
    instanceName?: string;
    customDataLayerImplementation: CustomDataLayerImplementation<
        TSettings,
        TData,
        TStoredData,
        TSettingTypes,
        TSettingKey
    >;
};

/*
 * The LayerDelegate class is responsible for managing the state of a layer.
 * It is responsible for (re-)fetching the data whenever changes to settings make it necessary.
 * It also manages the status of the layer (loading, success, error).
 */
export class DataLayer<
        TSettings extends Settings,
        TData,
        TStoredData extends StoredData = Record<string, never>,
        TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >
    implements Item, PublishSubscribe<LayerDelegatePayloads<TData>>
{
    private _type: string;
    private _customDataLayerImpl: CustomDataLayerImplementation<
        TSettings,
        TData,
        TStoredData,
        TSettingTypes,
        TSettingKey
    >;
    private _settingsContextDelegate: SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TSettingKey>;
    private _itemDelegate: ItemDelegate;
    private _layerManager: DataLayerManager;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _cancellationPending: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayerDelegatePayloads<TData>>();
    private _queryKeys: unknown[][] = [];
    private _status: DataLayerStatus = DataLayerStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _valueRange: [number, number] | null = null;
    private _isSubordinated: boolean = false;
    private _prevSettings: TSettingTypes | null = null;

    constructor(params: DataLayerParams<TSettings, TData, TStoredData, TSettingTypes, TSettingKey>) {
        const { layerManager, type, instanceName, customDataLayerImplementation } = params;
        this._type = type;
        this._layerManager = layerManager;
        this._settingsContextDelegate = new SettingsContextDelegate<TSettings, TSettingTypes, TStoredData, TSettingKey>(
            this,
            customDataLayerImplementation,
            layerManager,
            makeSettings<TSettings, TSettingTypes, TSettingKey>(
                customDataLayerImplementation.settings,
                customDataLayerImplementation.getDefaultSettingsValues?.() ?? {},
            ),
        );
        this._customDataLayerImpl = customDataLayerImplementation;
        this._itemDelegate = new ItemDelegate(
            instanceName ?? customDataLayerImplementation.getDefaultName(),
            1,
            layerManager,
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
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.GLOBAL_SETTINGS)(() => {
                this.handleSettingsChange();
            }),
        );
    }

    areCurrentSettingsValid(): boolean {
        if (!this._customDataLayerImpl.areCurrentSettingsValid) {
            return true;
        }

        return this._customDataLayerImpl.areCurrentSettingsValid(this.makeAccessors());
    }

    handleSettingsChange(): void {
        if (!this.areCurrentSettingsValid()) {
            this._error = "Invalid settings";
            this.setStatus(DataLayerStatus.INVALID_SETTINGS);
            return;
        }

        const refetchRequired =
            this._customDataLayerImpl.doSettingsChangesRequireDataRefetch?.(
                this._prevSettings,
                this._settingsContextDelegate.getValues() as TSettingTypes,
                this.makeAccessors(),
            ) ?? !isEqual(this._prevSettings, this._settingsContextDelegate.getValues() as TSettingTypes);

        if (!refetchRequired) {
            this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.DATA);
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
            this.setStatus(DataLayerStatus.SUCCESS);
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
            this.setStatus(DataLayerStatus.INVALID_SETTINGS);
            return;
        }
        if (status === SettingsContextStatus.LOADING) {
            this.setStatus(DataLayerStatus.LOADING);
            return;
        }
    }

    registerQueryKey(queryKey: unknown[]): void {
        this._queryKeys.push(queryKey);
    }

    getStatus(): DataLayerStatus {
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
        this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.SUBORDINATED);
    }

    getValueRange(): [number, number] | null {
        return this._valueRange;
    }

    getLayerManager(): DataLayerManager {
        return this._layerManager;
    }

    makeSnapshotGetter<T extends LayerDelegateTopic>(topic: T): () => LayerDelegatePayloads<TData>[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerDelegateTopic.STATUS) {
                return this._status;
            }
            if (topic === LayerDelegateTopic.DATA) {
                return this._data;
            }
            if (topic === LayerDelegateTopic.SUBORDINATED) {
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

    makeAccessors(): DataLayerInformationAccessors<TSettings, TData, TStoredData, TSettingKey> {
        return {
            getSetting: (settingName) => this._settingsContextDelegate.getSettings()[settingName].getValue(),
            getAvailableSettingValues: (settingName) =>
                this._settingsContextDelegate.getSettings()[settingName].getAvailableValues(),
            getGlobalSetting: (settingName) => this._layerManager.getGlobalSetting(settingName),
            getStoredData: (key: keyof TStoredData) => this._settingsContextDelegate.getStoredData(key),
            getData: () => this._data,
            getWorkbenchSession: () => this._layerManager.getWorkbenchSession(),
            getWorkbenchSettings: () => this._layerManager.getWorkbenchSettings(),
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

        this.setStatus(DataLayerStatus.LOADING);

        try {
            this._data = await this._customDataLayerImpl.fetchData({
                ...accessors,
                queryClient,
                registerQueryKey: (key) => this.registerQueryKey(key),
            });
            if (this._customDataLayerImpl.makeValueRange) {
                this._valueRange = this._customDataLayerImpl.makeValueRange(accessors);
            }
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your layer implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour.",
                );
            }
            this._queryKeys = [];
            this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.DATA);
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
            this.setStatus(DataLayerStatus.SUCCESS);
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
            this.setStatus(DataLayerStatus.ERROR);
        }
    }

    serializeState(): SerializedDataLayer<TSettings, TSettingKey> {
        const itemState = this.getItemDelegate().serializeState();
        return {
            ...itemState,
            type: SerializedType.DATA_LAYER,
            layerType: this._type,
            settings: this._settingsContextDelegate.serializeSettings(),
        };
    }

    deserializeState(serializedLayer: SerializedDataLayer<TSettings, TSettingKey>): void {
        this.getItemDelegate().deserializeState(serializedLayer);
        this._settingsContextDelegate.deserializeSettings(serializedLayer.settings);
    }

    beforeDestroy(): void {
        this._settingsContextDelegate.beforeDestroy();
        this._unsubscribeHandler.unsubscribeAll();
    }

    private setStatus(status: DataLayerStatus): void {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._layerManager?.getQueryClient() ?? null;
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
