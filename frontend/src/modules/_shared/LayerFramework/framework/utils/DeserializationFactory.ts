import {
    Item,
    SerializedColorScale,
    SerializedItem,
    SerializedLayer,
    SerializedSettingsGroup,
    SerializedSharedSetting,
    SerializedType,
    SerializedView,
} from "../../interfaces";
import { LayerRegistry } from "../../layers/LayerRegistry";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { ColorScale } from "../ColorScale/ColorScale";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { GroupImpl } from "../Group/Group";
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
            const layer = LayerRegistry.makeLayer(serializedLayer.layerName, this._layerManager, serializedLayer.name);
            layer.deserializeState(serializedLayer);
            layer.getItemDelegate().setId(serializedLayer.id);
            layer.getItemDelegate().setName(serializedLayer.name);
            return layer;
        }

        if (serialized.type === SerializedType.VIEW) {
            const serializedView = serialized as SerializedView;
            const view = new GroupImpl({
                name: serializedView.name,
                layerManager: this._layerManager,
                color: serializedView.color,
            });
            view.deserializeState(serializedView);
            return view;
        }

        if (serialized.type === SerializedType.SETTINGS_GROUP) {
            const serializedSettingsGroup = serialized as SerializedSettingsGroup;
            const settingsGroup = new SettingsGroup(serializedSettingsGroup.name, this._layerManager);
            settingsGroup.deserializeState(serializedSettingsGroup);
            return settingsGroup;
        }

        if (serialized.type === SerializedType.COLOR_SCALE) {
            const serializedColorScale = serialized as SerializedColorScale;
            const colorScale = new ColorScale(serializedColorScale.name, this._layerManager);
            colorScale.deserializeState(serializedColorScale);
            return colorScale;
        }

        if (serialized.type === SerializedType.SHARED_SETTING) {
            const serializedSharedSetting = serialized as SerializedSharedSetting;
            const wrappedSetting = SettingRegistry.makeSetting(
                serializedSharedSetting.wrappedSettingClass,
                serializedSharedSetting.wrappedSettingCtorParams
            );
            const setting = new SharedSetting(wrappedSetting, this._layerManager);
            setting.deserializeState(serializedSharedSetting);
            return setting;
        }

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
