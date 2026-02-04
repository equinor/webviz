import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic, SettingsContextStatus } from "../../delegates/SettingsContextDelegate";
import type { MultiDataProviderOperation } from "../../interfacesAndTypes/customDataProviderImplementation";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import { SerializedType, type SerializedOperationGroup } from "../../interfacesAndTypes/serialization";
import { DataProvider } from "../DataProvider/DataProvider";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

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
    [OperationGroupTopic.OPERATION]: MultiDataProviderOperation;
    [OperationGroupTopic.STATUS]: OperationGroupStatus;
    [OperationGroupTopic.PROGRESS_MESSAGE]: string | null;
};

export class OperationGroup implements ItemGroup, PublishSubscribe<OperationGroupPayloads> {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<OperationGroupPayloads>();

    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();

    private _operation: MultiDataProviderOperation;
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

    constructor(name: string, operation: MultiDataProviderOperation, dataProviderManager: DataProviderManager) {
        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
        this._groupDelegate = new GroupDelegate(this);
        this._operation = operation;
        this._scopedQueryController = new ScopedQueryController(dataProviderManager.getQueryClient());

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                },
            ),
        );
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
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

    deserializeState(serialized: SerializedOperationGroup): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
        this.handleChildrenChange();
    }

    serializeState(): SerializedOperationGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.OPERATION_GROUP,
            operation: this._operation,
            children: this.getGroupDelegate().serializeChildren(),
        };
    }

    setOperation(operation: MultiDataProviderOperation): void {
        this._operation = operation;
        this.checkIfChildrenSupportOperation();
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

    private checkIfChildrenSupportOperation(): void {
        for (const child of this._groupDelegate.getChildren()) {
            if (!(child instanceof DataProvider)) {
                this._isOperationSupportedByAllChildren = false;
                return;
            }

            if (!child.getSupportedOperations().includes(this._operation)) {
                this._isOperationSupportedByAllChildren = false;
                return;
            }
        }

        this._isOperationSupportedByAllChildren = true;
    }

    private checkIfChildrenOfSameType(): void {
        const children = this._groupDelegate.getChildren();
        if (children.length === 0) {
            this._areChildrenOfSameType = true;
            return;
        }

        const firstChildType = children[0].constructor.name;
        for (const child of children) {
            if (child.constructor.name !== firstChildType) {
                this._areChildrenOfSameType = false;
                return;
            }
        }

        this._areChildrenOfSameType = true;
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

        this.checkIfChildrenSupportOperation();
        this.checkIfChildrenOfSameType();
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
