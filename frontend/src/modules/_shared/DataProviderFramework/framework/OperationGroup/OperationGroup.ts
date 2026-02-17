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
import type { DataProviderMeta, ProviderSnapshot } from "../../interfacesAndTypes/customDataProviderImplementation";
import type {
    ChildSettingsUnion,
    CustomOperationGroupImplementation,
    DataProviderImplementation,
    FetchParams,
    Operation,
    OperationGroupInformationAccessors,
} from "../../interfacesAndTypes/customOperationGroupImplementation";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import type { ItemView, StateSnapshot } from "../../interfacesAndTypes/ItemView";
import {
    SerializedType,
    type SerializedOperationGroup,
    type SerializedSettingsState,
} from "../../interfacesAndTypes/serialization";
import type { OperationGroupType } from "../../operationGroups/operationGroupTypes";
import type { Setting } from "../../settings/settingsDefinitions";
import type { DataProvider } from "../DataProvider/DataProvider";
import { isDataProvider } from "../DataProvider/DataProvider";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { makeSettings } from "../utils/makeSettings";

export enum OperationGroupTopic {
    OPERATION = "operation",
    STATUS = "status",
    ERROR_MESSAGE = "error-message",
    PROGRESS_MESSAGE = "progress-message",
}

export enum OperationGroupStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    INVALID_SETTINGS = "INVALID_SETTINGS",
    SUCCESS = "SUCCESS",
    CHILDREN_OF_DIFFERENT_TYPES = "CHILDREN_OF_DIFFERENT_TYPES",
    UNSUPPORTED_CHILDREN = "UNSUPPORTED_CHILDREN",
    INSUFFICIENT_CHILDREN = "INSUFFICIENT_CHILDREN",
    TOO_MANY_CHILDREN = "TOO_MANY_CHILDREN",
}

export type OperationGroupPayloads = {
    [OperationGroupTopic.OPERATION]: Operation;
    [OperationGroupTopic.STATUS]: OperationGroupStatus;
    [OperationGroupTopic.ERROR_MESSAGE]: StatusMessage | string | null;
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

export type OperationGroupParams<
    TData,
    TMeta extends DataProviderMeta,
    TSupportedDataProviderImplementations extends DataProviderImplementation[],
> = {
    dataProviderManager: DataProviderManager;
    operation: Operation;
    operationGroupType: OperationGroupType;
    customOperationGroupImplementation: CustomOperationGroupImplementation<
        TData,
        TMeta,
        TSupportedDataProviderImplementations
    >;
};

export class OperationGroup<
        TData,
        TMeta extends DataProviderMeta,
        TSupportedDataProviderImplementations extends DataProviderImplementation[] = [],
    >
    implements ItemGroup, PublishSubscribe<OperationGroupPayloads>, ItemView
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
        TMeta,
        TSupportedDataProviderImplementations
    >;

    private _type: OperationGroupType;
    private _operation: Operation;
    private _status: OperationGroupStatus = OperationGroupStatus.IDLE;

    private _error: StatusMessage | string | null = null;
    private _currentTransactionId: number = 0;
    private _data: TData | null = null;
    private _progressMessage: string | null = null;
    private _scopedQueryController: ScopedQueryController;
    private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _onFetchCancelOrFinishFn: () => void = () => {};

    private _cachedStateSnapshot: StateSnapshot<TData, TMeta> | null = null;
    private _cachedStateSnapshotRevision: number = -1;

    constructor(params: OperationGroupParams<TData, TMeta, TSupportedDataProviderImplementations>) {
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

    getId(): string {
        return this._itemDelegate.getId();
    }

    getName(): string {
        return this._itemDelegate.getName();
    }

    isVisible(): boolean {
        return this._itemDelegate.isVisible();
    }

    getType(): string {
        return this._type;
    }

    getStatus(): OperationGroupStatus {
        return this._status;
    }

    getData(): TData | null {
        return this._data;
    }

    private mapStatusToStateSnapshotStatus(status: OperationGroupStatus): StateSnapshot<TData, TMeta>["status"] {
        switch (status) {
            case OperationGroupStatus.LOADING:
                return "loading";
            case OperationGroupStatus.SUCCESS:
                return "ready";
            case OperationGroupStatus.ERROR:
            case OperationGroupStatus.INVALID_SETTINGS:
                return "error";
            case OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES:
            case OperationGroupStatus.UNSUPPORTED_CHILDREN:
            case OperationGroupStatus.INSUFFICIENT_CHILDREN:
            case OperationGroupStatus.TOO_MANY_CHILDREN:
                return "error";
            case OperationGroupStatus.IDLE:
            default:
                return "loading";
        }
    }

    getRevisionNumber(): number {
        return this._itemDelegate.getRevisionNumber();
    }

    private makeAccessors(): OperationGroupInformationAccessors<TData, TSupportedDataProviderImplementations> {
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

        return {
            childrenSettings: allSettings,
            getSharedSettings: () => {
                if (!this._sharedSettingsDelegate) {
                    return {};
                }
                const wrappedSettings = this._sharedSettingsDelegate.getWrappedSettings();
                const values: Record<string, unknown> = {};
                for (const [key, manager] of Object.entries(wrappedSettings)) {
                    values[key] = manager.getValue();
                }
                return values as any;
            },
            getGlobalSetting: (settingName) =>
                this._itemDelegate.getDataProviderManager().getGlobalSetting(settingName),
            getData: () => this._data,
            getWorkbenchSession: () => this._itemDelegate.getDataProviderManager().getWorkbenchSession(),
            getWorkbenchSettings: () => this._itemDelegate.getDataProviderManager().getWorkbenchSettings(),
        };
    }

    getStateSnapshot(): StateSnapshot<TData, TMeta> | null {
        if (this._cachedStateSnapshot && this._cachedStateSnapshotRevision === this.getRevisionNumber()) {
            return this._cachedStateSnapshot;
        }

        let providerSnapshot: ProviderSnapshot<TData, TMeta> | null = null;

        if (this._data !== null && this._status === OperationGroupStatus.SUCCESS) {
            providerSnapshot = this._customOperationGroupImplementation.makeProviderSnapshot(this.makeAccessors());
        }

        const snapshot = {
            id: this.getId(),
            name: this.getName(),
            type: this.getType(),
            visible: this.isVisible(),
            status: this.mapStatusToStateSnapshotStatus(this._status),
            error: this.getError(),
            revision: this.getRevisionNumber(),
            snapshot: providerSnapshot,
        };

        this._cachedStateSnapshot = snapshot;
        this._cachedStateSnapshotRevision = this.getRevisionNumber();
        return snapshot;
    }

    handleSettingsChange() {
        this.incrementRevisionNumber();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getMinChildrenCount(): number {
        return this._customOperationGroupImplementation.minChildrenCount ?? 2;
    }

    getMaxChildrenCount(): number | null {
        return this._customOperationGroupImplementation.maxChildrenCount ?? null;
    }

    canAcceptChild(child: Item): boolean {
        if (!isDataProvider(child)) {
            return false;
        }

        const maxChildren = this.getMaxChildrenCount();
        if (maxChildren != null && this._groupDelegate.getChildren().length >= maxChildren) {
            return false;
        }

        const supportedImplementations = this._customOperationGroupImplementation.supportedDataProviderImplementations;
        if (!supportedImplementations.includes(child.getProviderImplementation().constructor as any)) {
            return false;
        }

        return true;
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

    getSupportedDataProviderImplementations(): DataProviderImplementation[] {
        return this._customOperationGroupImplementation.supportedDataProviderImplementations;
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
            if (topic === OperationGroupTopic.ERROR_MESSAGE) {
                return this.getError();
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

        if (typeof this._error === "string") {
            return `${this._error}`;
        }

        return {
            ...this._error,
            message: `${this._error.message}`,
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
        if (this._status === status) {
            return;
        }

        this._status = status;
        this.incrementRevisionNumber();
        this._publishSubscribeDelegate.notifySubscribers(OperationGroupTopic.STATUS);
    }

    private setError(error: StatusMessage | string | null): void {
        if (this._error === error) {
            return;
        }
        this._error = error;
        this._publishSubscribeDelegate.notifySubscribers(OperationGroupTopic.ERROR_MESSAGE);
    }

    private incrementRevisionNumber(): void {
        this._itemDelegate.incrementRevisionNumber();
    }

    private hasInvalidChildren(): boolean {
        const children = [...this._childrenDataProviderSet];

        const minChildren = this._customOperationGroupImplementation.minChildrenCount ?? 2;
        if (children.length < minChildren) {
            this.setError(`At least ${minChildren} children are required.`);
            this.setStatus(OperationGroupStatus.INSUFFICIENT_CHILDREN);
            return true;
        }

        const maxChildren = this._customOperationGroupImplementation.maxChildrenCount;
        if (maxChildren != null && children.length > maxChildren) {
            this.setError(`At most ${maxChildren} children are allowed.`);
            this.setStatus(OperationGroupStatus.TOO_MANY_CHILDREN);
            return true;
        }

        const supportedImplementations = this._customOperationGroupImplementation.supportedDataProviderImplementations;

        let firstType: string | null = null;
        for (const child of children) {
            if (!supportedImplementations.includes(child.getProviderImplementation().constructor as any)) {
                this.setError(`Child '${child.getName()}' is not supported.`);
                this.setStatus(OperationGroupStatus.UNSUPPORTED_CHILDREN);
                return true;
            }

            const childType = child.getType();
            if (!firstType) {
                firstType = childType;
            } else if (childType !== firstType) {
                this.setError(
                    `Child '${child.getName()}' has to be of same type as first child '${children[0].getName()}'.`,
                );
                this.setStatus(OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES);
                return true;
            }
        }

        return false;
    }

    private handleChildrenChange(): void {
        this.clear();

        for (const [index, child] of this._groupDelegate.getChildren().entries()) {
            if (!isDataProvider(child)) {
                this.setError("Operation group can only have data providers as children.");
                this.setStatus(OperationGroupStatus.ERROR);
                return;
            }

            child.setIsSubordinated(true);
            this._childrenDataProviderSet.add(child);

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "providers",
                child
                    .getSettingsContextDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED)(() => {
                    this.handleSettingsAndStoredDataChange();
                }),
            );

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "providers",
                child
                    .getSettingsContextDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingsContextDelegateTopic.STATUS)(() => {
                    this.handleChildSettingsStatusChange();
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

        this.handleSettingsAndStoredDataChange();
    }

    private handleChildSettingsStatusChange(): void {
        for (const child of this._childrenDataProviderSet) {
            const status = child.getSettingsContextDelegate().getStatus();
            if (status === SettingsContextStatus.LOADING) {
                this.setStatus(OperationGroupStatus.LOADING);
                return;
            }
            if (status === SettingsContextStatus.INVALID_SETTINGS) {
                this.setStatus(OperationGroupStatus.INVALID_SETTINGS);
                return;
            }
        }
    }

    private handleSettingsAndStoredDataChange(): void {
        const hasInvalidChildren = this.hasInvalidChildren();
        if (hasInvalidChildren) {
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
            this.setError("One or more children have invalid settings.");
            this.setStatus(OperationGroupStatus.INVALID_SETTINGS);
            return;
        }

        this.tidyUpFetchRelatedResources();

        this._currentTransactionId += 1;
        const localTransactionId = this._currentTransactionId;

        // Debounce the refetch to avoid multiple refetches in a short time span.
        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
        }
        this._debounceTimeout = setTimeout(() => {
            if (this._currentTransactionId !== localTransactionId) {
                return;
            }
            this.fetchData();
        }, 10);
    }

    private fetchData(): void {
        // Collect all children settings
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

        this.setStatus(OperationGroupStatus.LOADING);

        this._customOperationGroupImplementation
            .fetchData(params)
            .then((data) => {
                this._data = data;
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
        this.tidyUpFetchRelatedResources();

        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
            this._debounceTimeout = null;
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("providers");

        for (const provider of this._childrenDataProviderSet) {
            provider.setIsSubordinated(false);
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("shared-settings");
        this._sharedSettingsDelegate = null;

        this._childrenDataProviderSet.clear();
        this._data = null;
        this._error = null;
        this._status = OperationGroupStatus.IDLE;
    }
}
