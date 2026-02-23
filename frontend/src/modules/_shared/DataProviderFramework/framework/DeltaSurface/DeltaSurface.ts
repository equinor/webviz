import type { QueryClient, FetchQueryOptions } from "@tanstack/react-query";

import { getDeltaSurfaceDataOptions, getDeltaSurfaceDataQueryKey } from "@api";
import type { GetDeltaSurfaceDataData_api } from "@api";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { encodeSurfAddrStr } from "../../../Surface/surfaceAddress";
import type { SurfaceDataFormat, SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";
import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic } from "../../delegates/SettingsContextDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import type { SerializedDeltaSurface } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderStatus } from "../DataProvider/DataProviderEnums";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

export enum DeltaSurfaceStatus {
    IDLE = "idle",
    LOADING = "loading",
    SUCCESS = "success",
    ERROR = "error",
    INVALID = "invalid",
}

export enum DeltaSurfaceTopic {
    STATUS = "status",
    DATA = "data",
}

type DeltaSurfaceTopicPayloads = {
    [DeltaSurfaceTopic.STATUS]: DeltaSurfaceStatus;
    [DeltaSurfaceTopic.DATA]: SurfaceData;
};

export class DeltaSurface implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DeltaSurfaceTopicPayloads>();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();
    private _status: DeltaSurfaceStatus = DeltaSurfaceStatus.IDLE;
    private _deltaSurfaceData: SurfaceData | null = null;
    private _error: string | null = null;
    private _dataProviderManager: DataProviderManager;
    private _dataFormat: SurfaceDataFormat = "float";
    private _abortController: AbortController | null = null;

    constructor(name: string, dataProviderManager: DataProviderManager) {
        this._groupDelegate = new GroupDelegate(this);
        this._dataProviderManager = dataProviderManager;

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                },
            ),
        );

        this._groupDelegate.setColor("rgb(220, 210, 180)");
        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
    }

    private handleChildrenChange(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("providers");

        for (const provider of this._childrenDataProviderSet) {
            provider.setIsSubordinated(false);
        }

        this._childrenDataProviderSet.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (child instanceof DataProvider) {
                child.setIsSubordinated(true);
                this._childrenDataProviderSet.add(child);

                this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                    "providers",
                    child
                        .getSettingsContextDelegate()
                        .getPublishSubscribeDelegate()
                        .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED)(() => {
                        this.handleSettingsChange();
                    }),
                );
            }
        }

        this.fetchDeltaSurface();
    }

    private handleSettingsChange(): void {
        // When settings change in child providers, refetch the delta
        this.fetchDeltaSurface();
    }

    private async fetchDeltaSurface(): Promise<void> {
        // Cancel any ongoing fetch
        if (this._abortController) {
            this._abortController.abort();
        }

        const providers = Array.from(this._childrenDataProviderSet);

        if (providers.length !== 2) {
            this.setStatus(DeltaSurfaceStatus.INVALID);
            this._error = "Delta surface requires exactly 2 surface providers";
            this._deltaSurfaceData = null;
            return;
        }

        const [providerA, providerB] = providers;

        // Check if both providers have valid settings and surface addresses
        if (!providerA.areCurrentSettingsValid() || !providerB.areCurrentSettingsValid()) {
            this.setStatus(DeltaSurfaceStatus.INVALID);
            this._error = "Invalid settings in one or more surfaces";
            this._deltaSurfaceData = null;
            return;
        }

        // Get surface addresses from providers
        const surfAddrA = this.getSurfaceAddressFromProvider(providerA);
        const surfAddrB = this.getSurfaceAddressFromProvider(providerB);

        if (!surfAddrA || !surfAddrB) {
            this.setStatus(DeltaSurfaceStatus.IDLE);
            this._deltaSurfaceData = null;
            return;
        }

        const surfAddrStrA = encodeSurfAddrStr(surfAddrA);
        const surfAddrStrB = encodeSurfAddrStr(surfAddrB);

        this.setStatus(DeltaSurfaceStatus.LOADING);
        this._error = null;

        this._abortController = new AbortController();

        try {
            const queryClient = this._dataProviderManager.getQueryClient();
            if (!queryClient) {
                throw new Error("QueryClient not available");
            }

            const apiOptions: GetDeltaSurfaceDataData_api = {
                query: {
                    surf_a_addr_str: surfAddrStrA,
                    surf_b_addr_str: surfAddrStrB,
                    data_format: this._dataFormat,
                    resample_to_def_str: null,
                },
            };

            const queryOptions = getDeltaSurfaceDataOptions(apiOptions);

            const data = await queryClient.fetchQuery({
                ...queryOptions,
                signal: this._abortController.signal,
            });

            this._deltaSurfaceData = {
                format: this._dataFormat,
                surfaceData: data,
            };

            this.setStatus(DeltaSurfaceStatus.SUCCESS);
            this._publishSubscribeDelegate.notifySubscribers(DeltaSurfaceTopic.DATA);
        } catch (error: any) {
            if (error.name === "AbortError" || error.name === "CanceledError") {
                return;
            }

            this._error = error.message || "Failed to fetch delta surface";
            this.setStatus(DeltaSurfaceStatus.ERROR);
            this._deltaSurfaceData = null;
        } finally {
            this._abortController = null;
        }
    }

    private getSurfaceAddressFromProvider(provider: DataProvider<any, any>): any {
        // Access the custom implementation to call getSurfaceAddress if available
        const customImpl = (provider as any)._customDataProviderImpl;
        
        if (!customImpl || typeof customImpl.getSurfaceAddress !== "function") {
            console.warn("Provider does not have getSurfaceAddress method:", provider.getType());
            return null;
        }

        // Build the params needed for getSurfaceAddress
        const settingsContext = provider.getSettingsContextDelegate();
        const params = {
            getSetting: (key: any) => settingsContext.getSetting(key),
            getStoredData: (key: any) => settingsContext.getStoredData()[key],
            getWorkbenchSession: () => provider.getItemDelegate().getDataProviderManager().getWorkbenchSession(),
        };

        try {
            return customImpl.getSurfaceAddress(params);
        } catch (error) {
            console.error("Error getting surface address from provider:", error);
            return null;
        }
    }

    private setStatus(status: DeltaSurfaceStatus): void {
        if (this._status === status) {
            return;
        }
        this._status = status;
        this._publishSubscribeDelegate.notifySubscribers(DeltaSurfaceTopic.STATUS);
    }

    getStatus(): DeltaSurfaceStatus {
        return this._status;
    }

    getData(): SurfaceData | null {
        return this._deltaSurfaceData;
    }

    getError(): string | null {
        return this._error;
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    deserializeState(serialized: SerializedDeltaSurface): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
    }

    serializeState(): SerializedDeltaSurface {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.DELTA_SURFACE,
            children: this.getGroupDelegate().serializeChildren(),
        };
    }
}
