import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { QueryClient, isCancelledError } from "@tanstack/react-query";



import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegate, SettingsContextDelegateTopic } from "../../delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import { BoundingBox, CustomDataLayerImplementation, DataLayerInformationAccessors, Item, LayerColoringType, SerializedLayer, SerializedType, Settings, StoredData } from "../../interfaces";
import { MakeSettingTypesMap } from "../../settings/settingsTypes";
import { DataLayerManager, LayerManagerTopic } from "../DataLayerManager/DataLayerManager";
import { Setting } from "../Setting/Setting";
import { makeSettings } from "../utils/makeSettings";


export enum LayerDelegateTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
}

export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
}

export type LayerDelegatePayloads<TData> = {
    [LayerDelegateTopic.STATUS]: LayerStatus;
    [LayerDelegateTopic.DATA]: TData;
    [LayerDelegateTopic.SUBORDINATED]: boolean;
};

export type DataLayerParams<
    TSettingTypes extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> = {
    type: string;
    layerManager: DataLayerManager;
    instanceName?: string;
    customDataLayerImplementation: CustomDataLayerImplementation<TSettingTypes, TData, TStoredData, TSettings>;
};

/*
 * The LayerDelegate class is responsible for managing the state of a layer.
 * It is responsible for (re-)fetching the data whenever changes to settings make it necessary.
 * It also manages the status of the layer (loading, success, error).
 */
export class DataLayer<
    const TSettingTypes extends Settings,
    const TData,
    const TStoredData extends StoredData = Record<string, never>,
    const TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> implements Item, PublishSubscribe<LayerDelegatePayloads<TData>>
{
    private _type: string;
    private _customDataLayerImpl: CustomDataLayerImplementation<TSettingTypes, TData, TStoredData, TSettings>;
    private _settingsContextDelegate: SettingsContextDelegate<TSettingTypes, TSettings, TStoredData>;
    private _itemDelegate: ItemDelegate;
    private _layerManager: DataLayerManager;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _cancellationPending: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayerDelegatePayloads<TData>>();
    private _queryKeys: unknown[][] = [];
    private _status: LayerStatus = LayerStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _prevBoundingBox: BoundingBox | null = null;
    private _predictedBoundingBox: BoundingBox | null = null;
    private _boundingBox: BoundingBox | null = null;
    private _valueRange: [number, number] | null = null;
    private _isSubordinated: boolean = false;

    constructor(params: DataLayerParams<TSettingTypes, TData, TStoredData, TSettings>) {
        const { layerManager, type, instanceName, customDataLayerImplementation } = params;
        this._type = type;
        this._layerManager = layerManager;
        this._settingsContextDelegate = new SettingsContextDelegate<TSettingTypes, TSettings, TStoredData>(
            this,
            customDataLayerImplementation,
            layerManager,
            makeSettings(
                customDataLayerImplementation.settings,
                customDataLayerImplementation.getDefaultSettingsValues() as TSettings
            ) as {
                [key in keyof TSettings]: Setting<any>;
            }
        );
        this._customDataLayerImpl = customDataLayerImplementation;
        this._itemDelegate = new ItemDelegate(
            instanceName ?? customDataLayerImplementation.getDefaultName(),
            1,
            layerManager
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContextDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
                this.handleSettingsChange();
            })
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED)(() => {
                this.handleSettingsChange();
            })
        );
    }

    handleSettingsChange(): void {
        this._cancellationPending = true;
        this.maybeCancelQuery().then(() => {
            this.maybeRefetchData();
        });
    }

    registerQueryKey(queryKey: unknown[]): void {
        this._queryKeys.push(queryKey);
    }

    getStatus(): LayerStatus {
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

    getBoundingBox(): BoundingBox | null {
        return this._boundingBox;
    }

    getLastValidBoundingBox(): BoundingBox | null {
        if (this._boundingBox) {
            return this._boundingBox;
        }
        return this._prevBoundingBox;
    }

    getPredictedBoundingBox(): BoundingBox | null {
        return this._predictedBoundingBox;
    }

    getColoringType(): LayerColoringType {
        return this._customDataLayerImpl.getColoringType();
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

    private makeAccessors(): DataLayerInformationAccessors<TSettings, TData, TStoredData> {
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

        this.invalidateBoundingBox();
        this.invalidateValueRange();
        this._predictedBoundingBox = this._customDataLayerImpl.predictBoundingBox?.(accessors) ?? null;

        this.setStatus(LayerStatus.LOADING);

        try {
            this._data = await this._customDataLayerImpl.fetchData({
                ...accessors,
                queryClient,
                registerQueryKey: (key) => this.registerQueryKey(key),
            });
            if (this._customDataLayerImpl.makeBoundingBox) {
                this._boundingBox = this._customDataLayerImpl.makeBoundingBox(accessors);
            }
            if (this._customDataLayerImpl.makeValueRange) {
                this._valueRange = this._customDataLayerImpl.makeValueRange(accessors);
            }
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your layer implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour."
                );
            }
            this._queryKeys = [];
            this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.DATA);
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
            this.setStatus(LayerStatus.SUCCESS);
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
            this.setStatus(LayerStatus.ERROR);
        }
    }

    serializeState(): SerializedLayer<TSettings> {
        const itemState = this.getItemDelegate().serializeState();
        return {
            ...itemState,
            type: SerializedType.LAYER,
            layerName: this._customDataLayerImpl.constructor.name,
            settings: this._settingsContextDelegate.serializeSettings(),
        };
    }

    deserializeState(serializedLayer: SerializedLayer<TSettings>): void {
        this.getItemDelegate().deserializeState(serializedLayer);
        this._settingsContextDelegate.deserializeSettings(serializedLayer.settings);
    }

    beforeDestroy(): void {
        this._settingsContextDelegate.beforeDestroy();
        this._unsubscribeHandler.unsubscribeAll();
    }

    private setStatus(status: LayerStatus): void {
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

    private invalidateBoundingBox(): void {
        if (this._boundingBox) {
            this._prevBoundingBox = {
                x: [this._boundingBox.x[0], this._boundingBox.x[1]],
                y: [this._boundingBox.y[0], this._boundingBox.y[1]],
                z: [this._boundingBox.z[0], this._boundingBox.z[1]],
            };
        } else {
            this._prevBoundingBox = null;
        }
        this._boundingBox = null;
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
                        exact: true,
                        fetchStatus: "fetching",
                        type: "active",
                    },
                    {
                        silent: true,
                        revert: true,
                    }
                );
                await queryClient.invalidateQueries({ queryKey });
                queryClient.removeQueries({ queryKey });
            }
            this._queryKeys = [];
        }

        this._cancellationPending = false;
    }
}