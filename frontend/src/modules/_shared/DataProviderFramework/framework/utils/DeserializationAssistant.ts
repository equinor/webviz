import { DataProviderRegistry } from "../../dataProviders/DataProviderRegistry";
import { GroupRegistry } from "../../groups/GroupRegistry";
import type { Item } from "../../interfacesAndTypes/entities";
import type {
    SerializedDataProvider,
    SerializedGroup,
    SerializedItem,
    SerializedContextBoundary,
    SerializedSharedSetting,
} from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { ContextBoundary } from "../ContextBoundary/ContextBoundary";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { ErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export type ErrorMessage = {
    itemName: string;
    message: string;
};

export interface ReportErrorFunction {
    (errorMsg: string): void;
}

export class DeserializationAssistant {
    private _dataProviderManager: DataProviderManager;
    private _collectedErrorMessages: ErrorMessage[] = [];

    constructor(dataProviderManager: DataProviderManager) {
        this._dataProviderManager = dataProviderManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === SerializedType.DATA_PROVIDER_MANAGER) {
            throw new Error(
                "Cannot deserialize a DataProviderManager in DeserializationFactory. A DataProviderManager can never be a descendant of a DataProviderManager.",
            );
        }

        const reportError = (errorMsg: string) => {
            const itemName = serialized.name ?? "Unknown item";
            this._collectedErrorMessages.push({ itemName, message: errorMsg });
        };

        try {
            if (serialized.type === SerializedType.DATA_PROVIDER) {
                const serializedDataProvider = serialized as SerializedDataProvider<any>;
                const provider = DataProviderRegistry.makeDataProvider(
                    serializedDataProvider.dataProviderType,
                    this._dataProviderManager,
                    serializedDataProvider.name,
                );
                provider.deserializeState(serializedDataProvider, reportError);
                provider.getItemDelegate().setId(serializedDataProvider.id);
                provider.getItemDelegate().setName(serializedDataProvider.name);
                return provider;
            }

            if (serialized.type === SerializedType.GROUP) {
                const serializedGroup = serialized as SerializedGroup<any>;
                const group = GroupRegistry.makeGroup(serializedGroup.groupType, this._dataProviderManager);
                group.deserializeState(serializedGroup, reportError);
                return group;
            }

            if (serialized.type === SerializedType.CONTEXT_BOUNDARY) {
                const serializedContextBoundary = serialized as SerializedContextBoundary;
                const contextBoundary = new ContextBoundary(serializedContextBoundary.name, this._dataProviderManager);
                contextBoundary.deserializeState(serializedContextBoundary);
                return contextBoundary;
            }

            if (serialized.type === SerializedType.SHARED_SETTING) {
                const serializedSharedSetting = serialized as SerializedSharedSetting;
                const setting = new SharedSetting(
                    serializedSharedSetting.wrappedSettingType,
                    serializedSharedSetting.value,
                    this._dataProviderManager,
                );
                setting.deserializeState(serializedSharedSetting);
                return setting;
            }
        } catch (error) {
            const name = serialized.name ?? "Unknown item";
            const errorPlaceholder = new ErrorPlaceholder(
                name,
                error instanceof Error ? error.message : String(error),
                serialized as any,
                this._dataProviderManager,
            );
            return errorPlaceholder;
        }

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
