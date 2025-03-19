import { GroupRegistry } from "../../groups/GroupRegistry";
import {
    Item,
    SerializedGroup,
    SerializedItem,
    SerializedLayer,
    SerializedSettingsGroup,
    SerializedSharedSetting,
    SerializedType,
} from "../../interfaces";
import { LayerRegistry } from "../../layers/LayerRegistry";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { SettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export class DeserializationFactory {
    private _layerManager: DataLayerManager;

    constructor(layerManager: DataLayerManager) {
        this._layerManager = layerManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === SerializedType.LAYER_MANAGER) {
            throw new Error(
                "Cannot deserialize a LayerManager in DeserializationFactory. A LayerManager can never be a descendant of a LayerManager."
            );
        }

        if (serialized.type === SerializedType.LAYER) {
            const serializedLayer = serialized as SerializedLayer<any>;
            const layer = LayerRegistry.makeLayer(serializedLayer.layerType, this._layerManager, serializedLayer.name);
            layer.deserializeState(serializedLayer);
            layer.getItemDelegate().setId(serializedLayer.id);
            layer.getItemDelegate().setName(serializedLayer.name);
            return layer;
        }

        if (serialized.type === SerializedType.GROUP) {
            const serializedView = serialized as SerializedGroup;
            const view = GroupRegistry.makeGroup(serializedView.groupType, this._layerManager);
            view.deserializeState(serializedView);
            return view;
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
                this._layerManager
            );
            setting.deserializeState(serializedSharedSetting);
            return setting;
        }

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
