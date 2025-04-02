import { GroupRegistry } from "../../groups/GroupRegistry";
import type { Item } from "../../interfacesAndTypes/entities";
import type {
    SerializedDataLayer,
    SerializedGroup,
    SerializedItem,
    SerializedSettingsGroup,
    SerializedSharedSetting,
} from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { LayerRegistry } from "../../layers/LayerRegistry";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { SettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export class DeserializationAssistant {
    private _layerManager: DataProviderManager;

    constructor(layerManager: DataProviderManager) {
        this._layerManager = layerManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === SerializedType.DATA_LAYER_MANAGER) {
            throw new Error(
                "Cannot deserialize a LayerManager in DeserializationFactory. A LayerManager can never be a descendant of a LayerManager.",
            );
        }

        if (serialized.type === SerializedType.DATA_LAYER) {
            const serializedLayer = serialized as SerializedDataLayer<any>;
            const layer = LayerRegistry.makeLayer(serializedLayer.layerType, this._layerManager, serializedLayer.name);
            layer.deserializeState(serializedLayer);
            layer.getItemDelegate().setId(serializedLayer.id);
            layer.getItemDelegate().setName(serializedLayer.name);
            return layer;
        }

        if (serialized.type === SerializedType.GROUP) {
            const serializedGroup = serialized as SerializedGroup;
            const group = GroupRegistry.makeGroup(serializedGroup.groupType, this._layerManager);
            group.deserializeState(serializedGroup);
            return group;
        }

        if (serialized.type === SerializedType.SETTINGS_GROUP) {
            const serializedSettingsGroup = serialized as SerializedSettingsGroup;
            const settingsGroup = new SettingsGroup(serializedSettingsGroup.name, this._layerManager);
            settingsGroup.deserializeState(serializedSettingsGroup);
            return settingsGroup;
        }

        if (serialized.type === SerializedType.SHARED_SETTING) {
            const serializedSharedSetting = serialized as SerializedSharedSetting;
            const setting = new SharedSetting(
                serializedSharedSetting.wrappedSettingType,
                serializedSharedSetting.value,
                this._layerManager,
            );
            setting.deserializeState(serializedSharedSetting);
            return setting;
        }

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
