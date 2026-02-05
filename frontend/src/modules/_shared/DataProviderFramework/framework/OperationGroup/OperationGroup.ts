import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic, SettingsContextStatus } from "../../delegates/SettingsContextDelegate";
import { SharedSettingsDelegate, SharedSettingsDelegateTopic } from "../../delegates/SharedSettingsDelegate";
import type {
    CustomOperationGroupImplementation,
    DataProviderImplementation,
    Operation,
} from "../../interfacesAndTypes/customOperationGroupImplementation";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import {
    SerializedType,
    type SerializedOperationGroup,
    type SerializedSettingsState,
} from "../../interfacesAndTypes/serialization";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { OperationGroupType } from "../../operationGroups/operationGroupTypes";
import type { Settings } from "../../settings/settingsDefinitions";
import { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderManagerTopic, type DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { makeSettings } from "../utils/makeSettings";

export enum OperationGroupTopic {
    OPERATION = "operation",
    STATUS = "status",
    PROGRESS_MESSAGE = "progress-message",
}

export enum OperationGroupStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    INVALID_SETTINGS = "INVALID_SETTINGS",
    SUCCESS = "SUCCESS",
    OPERATION_NOT_SUPPORTED_BY_CHILDREN = "OPERATION_NOT_SUPPORTED_BY_CHILDREN",
    CHILDREN_OF_DIFFERENT_TYPES = "CHILDREN_OF_DIFFERENT_TYPES",
}

export type OperationGroupPayloads = {
    [OperationGroupTopic.OPERATION]: Operation;
    [OperationGroupTopic.STATUS]: OperationGroupStatus;
    [OperationGroupTopic.PROGRESS_MESSAGE]: string | null;
};

export type OperationGroupParams<
    TData,
    TSupportedDataProviderImplementations extends DataProviderImplementation[],
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
> = {
    dataProviderManager: DataProviderManager;
    operation: Operation;
    operationGroupType: OperationGroupType;
    customOperationGroupImplementation: CustomOperationGroupImplementation<
        TData,
        TSupportedDataProviderImplementations,
        TSettings,
        TSettingTypes
    >;
};

export class OperationGroup<
        TData,
        TSettings extends Settings = [],
        TSupportedDataProviderImplementations extends DataProviderImplementation[] = [],
        TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
        TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    >
    implements ItemGroup, PublishSubscribe<OperationGroupPayloads>
{
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _sharedSettingsDelegate: SharedSettingsDelegate<TSettings, TSettingTypes, TSettingKey> | null = null;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<OperationGroupPayloads>();

    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();

    private _operation: Operation;
    private _status: OperationGroupStatus = OperationGroupStatus.IDLE;

    private _error: StatusMessage | string | null = null;
    private _areChildrenOfSameType: boolean = true;
    private _isOperationSupportedByAllChildren: boolean = true;
    private _revisionNumber: number = 0;
    private _currentTransactionId: number = 0;
    private _progressMessage: string | null = null;
    private _scopedQueryController: ScopedQueryController;
    private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _onFetchCancelOrFinishFn: () => void = () => {};

    constructor(params: OperationGroupParams<TData, TSupportedDataProviderImplementations, TSettings, TSettingTypes>) {
        const { dataProviderManager, operation, customOperationGroupImplementation } = params;

        this._itemDelegate = new ItemDelegate(customOperationGroupImplementation.getName(), 1, dataProviderManager);
        this._groupDelegate = new GroupDelegate(this);
        this._operation = operation;
        this._scopedQueryController = new ScopedQueryController(dataProviderManager.getQueryClient());

        if (customOperationGroupImplementation.settings.length > 0) {
            this._sharedSettingsDelegate = new SharedSettingsDelegate<TSettings, TSettingTypes, TSettingKey>(
                this,
                makeSettings<TSettings, TSettingTypes, TSettingKey>(
                    customOperationGroupImplementation.settings as unknown as TSettings,
                    customOperationGroupImplementation.getDefaultSettingsValues?.() ?? {},
                ),
            );
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "shared-settings",
                this._sharedSettingsDelegate
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SharedSettingsDelegateTopic.SETTINGS_CHANGED)(() =>
                    this.handleSettingsChange(),
                ),
            );
        }
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                },
            ),
        );
    }

    handleSettingsChange() {
        this._itemDelegate.getDataProviderManager().publishTopic(DataProviderManagerTopic.DATA_REVISION);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    getSharedSettingsDelegate(): SharedSettingsDelegate<TSettings, TSettingTypes, TSettingKey> | null {
        return this._sharedSettingsDelegate;
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K> } {
        if (!this._sharedSettingsDelegate) {
            throw new Error("Group does not have shared settings.");
        }
        return this._sharedSettingsDelegate.getWrappedSettings();
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<OperationGroupPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends OperationGroupTopic>(topic: T): () => OperationGroupPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === OperationGroupTopic.OPERATION) {
                return this._operation;
            }
            if (topic === OperationGroupTopic.STATUS) {
                return this._status;
            }
            throw new Error(`Unknown topic: ${topic}`);
        };

        return snapshotGetter;
    }

    deserializeState(serialized: SerializedOperationGroup<TSettings, TSettingKey>): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
        this._sharedSettingsDelegate?.deserializeSettings(serialized.settings);
        this.handleChildrenChange();
    }

    serializeState(): SerializedOperationGroup<TSettings, TSettingKey> {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.OPERATION_GROUP,
            operation: this._operation,
            settings:
                this._sharedSettingsDelegate?.serializeSettings() ??
                ({} as SerializedSettingsState<TSettings, TSettingKey>),
            children: this.getGroupDelegate().serializeChildren(),
        };
    }

    setOperation(operation: Operation): void {
        this._operation = operation;
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
        this._publishSubscribeDelegate.notifySubscribers(OperationGroupTopic.PROGRESS_MESSAGE);
    }

    private setStatus(status: OperationGroupStatus): void {
        if (this._status !== status) {
            this._status = status;
            this._publishSubscribeDelegate.notifySubscribers(OperationGroupTopic.STATUS);
        }
    }

    private handleChildrenChange(): void {
        this.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (child instanceof DataProvider) {
                child.setIsSubordinated(true);
                this._childrenDataProviderSet.add(child);

                this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                    "providers",
                    child
                        .getSettingsContextDelegate()
                        .getPublishSubscribeDelegate()
                        .makeSubscriberFunction(SettingsContextDelegateTopic.STATUS)(() => {
                        this.handleSettingsAndStoredDataChange();
                    }),
                );
            }
        }
    }

    private handleSettingsAndStoredDataChange(): void {
        if (!this._areChildrenOfSameType) {
            this.setStatus(OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES);
            return;
        }

        if (!this._isOperationSupportedByAllChildren) {
            this.setStatus(OperationGroupStatus.OPERATION_NOT_SUPPORTED_BY_CHILDREN);
            return;
        }

        // Check status of all children's settings context delegates
        let anyLoading = false;
        let anyInvalidSettings = false;

        for (const child of this._childrenDataProviderSet) {
            const status = child.getSettingsContextDelegate().getStatus();
            if (status === SettingsContextStatus.LOADING) {
                anyLoading = true;
                break;
            }
            if (status === SettingsContextStatus.INVALID_SETTINGS) {
                anyInvalidSettings = true;
                break;
            }
        }

        if (anyLoading) {
            this.setStatus(OperationGroupStatus.LOADING);
            return;
        }

        if (anyInvalidSettings) {
            this.setStatus(OperationGroupStatus.INVALID_SETTINGS);
            return;
        }
    }

    private tidyUpFetchRelatedResources(): void {
        // Cancel any resources related to the last ongoing fetch.
        this._scopedQueryController.cancelActiveFetch();
        this._onFetchCancelOrFinishFn();
        this._onFetchCancelOrFinishFn = () => {};
    }

    private clear(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("providers");

        for (const provider of this._childrenDataProviderSet) {
            provider.setIsSubordinated(false);
        }

        this._childrenDataProviderSet.clear();
    }
}
