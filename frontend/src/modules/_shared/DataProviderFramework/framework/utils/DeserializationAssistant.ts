import { DataProviderRegistry } from "../../dataProviders/DataProviderRegistry";
import { GroupRegistry } from "../../groups/GroupRegistry";
import type { Item } from "../../interfacesAndTypes/entities";
import type {
    SerializedDataProvider,
    SerializedGroup,
    SerializedItem,
    SerializedSettingsGroup,
    SerializedSharedSetting,
} from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { SettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export class DeserializationAssistant {
    private _dataProviderManager: DataProviderManager;

    constructor(dataProviderManager: DataProviderManager) {
        this._dataProviderManager = dataProviderManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === SerializedType.DATA_PROVIDER_MANAGER) {
            throw new Error(
                "Cannot deserialize a DataProviderManager in DeserializationFactory. A DataProviderManager can never be a descendant of a DataProviderManager.",
            );
        }

        if (serialized.type === SerializedType.DATA_PROVIDER) {
            const serializedDataProvider = serialized as SerializedDataProvider<any>;
            const provider = DataProviderRegistry.makeDataProvider(
                serializedDataProvider.dataProviderType,
                this._dataProviderManager,
                serializedDataProvider.name,
            );
            provider.deserializeState(serializedDataProvider);
            provider.getItemDelegate().setId(serializedDataProvider.id);
            provider.getItemDelegate().setName(serializedDataProvider.name);
            return provider;
        }

        if (serialized.type === SerializedType.GROUP) {
            const serializedGroup = serialized as SerializedGroup;
            const group = GroupRegistry.makeGroup(serializedGroup.groupType, this._dataProviderManager);
            group.deserializeState(serializedGroup);
            return group;
        }

        if (serialized.type === SerializedType.SETTINGS_GROUP) {
            const serializedSettingsGroup = serialized as SerializedSettingsGroup;
            const settingsGroup = new SettingsGroup(serializedSettingsGroup.name, this._dataProviderManager);
            settingsGroup.deserializeState(serializedSettingsGroup);
            return settingsGroup;
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

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
