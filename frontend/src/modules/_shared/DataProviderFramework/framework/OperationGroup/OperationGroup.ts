import type { FetchQueryOptions, QueryKey } from "@tanstack/query-core";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { isDevMode } from "@lib/utils/devMode";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic, SettingsContextStatus } from "../../delegates/SettingsContextDelegate";
import { SharedSettingsDelegate, SharedSettingsDelegateTopic } from "../../delegates/SharedSettingsDelegate";
import type {
    ChildSettingsUnion,
    CustomOperationGroupImplementation,
    DataProviderImplementation,
    FetchParams,
    Operation,
} from "../../interfacesAndTypes/customOperationGroupImplementation";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import {
    SerializedType,
    type SerializedOperationGroup,
    type SerializedSettingsState,
} from "../../interfacesAndTypes/serialization";
import type { OperationGroupType } from "../../operationGroups/operationGroupTypes";
import type { Setting } from "../../settings/settingsDefinitions";
import type { DataProvider } from "../DataProvider/DataProvider";
import { isDataProvider } from "../DataProvider/DataProvider";
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
    CHILDREN_OF_DIFFERENT_TYPES = "CHILDREN_OF_DIFFERENT_TYPES",
}

export type OperationGroupPayloads = {
    [OperationGroupTopic.OPERATION]: Operation;
    [OperationGroupTopic.STATUS]: OperationGroupStatus;
    [OperationGroupTopic.PROGRESS_MESSAGE]: string | null;
};

export function isOperationGroup(obj: any): obj is OperationGroup<any, any> {
    if (!isDevMode()) {
        return obj instanceof OperationGroup;
    }

    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    if (obj.constructor.name !== "OperationGroup") {
        return false;
    }

    return Boolean(obj.getOperationGroupType) && Boolean(obj.getGroupDelegate);
}

export type OperationGroupParams<TData, TSupportedDataProviderImplementations extends DataProviderImplementation[]> = {
    dataProviderManager: DataProviderManager;
    operation: Operation;
    operationGroupType: OperationGroupType;
    customOperationGroupImplementation: CustomOperationGroupImplementation<
        TData,
        TSupportedDataProviderImplementations
    >;
};

export class OperationGroup<TData, TSupportedDataProviderImplementations extends DataProviderImplementation[] = []>
    implements ItemGroup, PublishSubscribe<OperationGroupPayloads>
{
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _sharedSettingsDelegate: SharedSettingsDelegate<any, any, any> | null = null;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<OperationGroupPayloads>();

    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();

    private _customOperationGroupImplementation: CustomOperationGroupImplementation<
        TData,
        TSupportedDataProviderImplementations
    >;

    private _type: OperationGroupType;
    private _operation: Operation;
    private _status: OperationGroupStatus = OperationGroupStatus.IDLE;

    private _error: StatusMessage | string | null = null;
    private _areChildrenOfSameType: boolean = true;
    private _revisionNumber: number = 0;
    private _currentTransactionId: number = 0;
    private _progressMessage: string | null = null;
    private _scopedQueryController: ScopedQueryController;
    private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _onFetchCancelOrFinishFn: () => void = () => {};

    constructor(params: OperationGroupParams<TData, TSupportedDataProviderImplementations>) {
        const { dataProviderManager, operation, customOperationGroupImplementation, operationGroupType } = params;

        this._customOperationGroupImplementation = customOperationGroupImplementation;
        this._itemDelegate = new ItemDelegate(customOperationGroupImplementation.getName(), 1, dataProviderManager);
        this._groupDelegate = new GroupDelegate(this);
        this._operation = operation;
        this._type = operationGroupType;
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

    handleSettingsChange() {
        this._itemDelegate.getDataProviderManager().publishTopic(DataProviderManagerTopic.DATA_REVISION);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getMaxChildrenCount(): number | null {
        return this._customOperationGroupImplementation.maxChildrenCount ?? null;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    getWrappedSettings(): Partial<Record<Setting, SettingManager<any, any, any>>> {
        if (!this._sharedSettingsDelegate) {
            throw new Error("Group does not have shared settings.");
        }
        return this._sharedSettingsDelegate.getWrappedSettings();
    }

    getOperationGroupType(): OperationGroupType {
        return this._type;
    }

    getSharedSettingsDelegate(): SharedSettingsDelegate<any, any, any> | null {
        return this._sharedSettingsDelegate;
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
            if (topic === OperationGroupTopic.PROGRESS_MESSAGE) {
                return this._progressMessage;
            }
            throw new Error(`Unknown topic: ${topic}`);
        };

        return snapshotGetter;
    }

    deserializeState(serialized: SerializedOperationGroup<any, any>): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
        this._sharedSettingsDelegate?.deserializeSettings(serialized.settings);
        this.handleChildrenChange();
    }

    serializeState(): SerializedOperationGroup<any, any> {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.OPERATION_GROUP,
            operation: this._operation,
            operationGroupType: this._type,
            settings: this._sharedSettingsDelegate?.serializeSettings() ?? ({} as SerializedSettingsState<any, any>),
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

    private checkIfChildrenAreOfSameType(): void {
        let firstType: string | null = null;

        for (const child of this._groupDelegate.getChildren()) {
            if (!isDataProvider(child)) {
                throw new Error("OperationGroup can only have DataProvider children.");
            }
            const childType = child.getType();
            if (!firstType) {
                firstType = childType;
            } else if (childType !== firstType) {
                this._areChildrenOfSameType = false;
                return;
            }
        }

        this._areChildrenOfSameType = true;
    }

    private handleChildrenChange(): void {
        this.clear();
        this.checkIfChildrenAreOfSameType();

        if (!this._areChildrenOfSameType) {
            this.setStatus(OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES);
            return;
        }

        for (const [index, child] of this._groupDelegate.getChildren().entries()) {
            if (!isDataProvider(child)) {
                throw new Error("OperationGroup can only have DataProvider children.");
            }

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

            if (index === 0) {
                const elevatableSettings = child.getSettingsContextDelegate().getElevatableSettings();
                if (elevatableSettings) {
                    this._sharedSettingsDelegate = new SharedSettingsDelegate(
                        this,
                        makeSettings(elevatableSettings, {}),
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
            }
        }

        this.checkIfChildrenAreOfSameType();

        this.handleSettingsAndStoredDataChange();
    }

    private handleSettingsAndStoredDataChange(): void {
        if (!this._areChildrenOfSameType) {
            this.setStatus(OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES);
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

        // Now we know all children have valid settings, we can collect all settings
        const allSettings: ChildSettingsUnion<TSupportedDataProviderImplementations>[] = [];

        for (const child of this._childrenDataProviderSet) {
            const settings: ChildSettingsUnion<TSupportedDataProviderImplementations>["settings"] =
                {} as ChildSettingsUnion<TSupportedDataProviderImplementations>["settings"];
            for (const [settingKey, settingManager] of Object.entries(
                child.getSettingsContextDelegate().getSettings(),
            )) {
                settings[settingKey as keyof typeof settings] = settingManager.getValue();
            }
            allSettings.push({
                providerImplementation: child.getProviderImplementation().constructor,
                settings: child.getSettingsContextDelegate().getValues(),
                storedData: child.getSettingsContextDelegate().getStoredDataRecord(),
            } as ChildSettingsUnion<TSupportedDataProviderImplementations>);
        }

        const onFetchCancelOrFinish = (fnc: () => void) => {
            this._onFetchCancelOrFinishFn = fnc;
        };

        const params: FetchParams<TSupportedDataProviderImplementations> = {
            childrenSettings: allSettings,
            fetchQuery: <TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
                options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
            ) => this._scopedQueryController.fetchQuery<TQueryFnData, TError, TData, TQueryKey>(options),
            onFetchCancelOrFinish,
            setProgressMessage: (message: string | null) => this.setProgressMessage(message),
        };

        this._customOperationGroupImplementation
            .fetchData(params)
            .then(() => {
                this.setStatus(OperationGroupStatus.SUCCESS);
                this._error = null;
            })
            .catch((error) => {
                this.setStatus(OperationGroupStatus.ERROR);
                if (typeof error === "string" || error instanceof Error) {
                    this._error = error instanceof Error ? error.message : error;
                } else {
                    this._error = "An unknown error occurred.";
                }
            })
            .finally(() => {
                this.tidyUpFetchRelatedResources();
            });
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

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("shared-settings");
        this._sharedSettingsDelegate = null;

        this._childrenDataProviderSet.clear();
    }
}
