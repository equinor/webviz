import { ColorScale } from "./ColorScale";
import { LayerManager } from "./LayerManager";
import { LayerRegistry } from "./LayerRegistry";
import { SettingRegistry } from "./SettingRegistry";
import { SettingsGroup } from "./SettingsGroup";
import { SharedSetting } from "./SharedSetting";
import { View } from "./View";
import {
    Item,
    SerializedColorScale,
    SerializedItem,
    SerializedLayer,
    SerializedSettingsGroup,
    SerializedSharedSetting,
    SerializedView,
} from "./interfaces";

export class DeserializationFactory {
    private _layerManager: LayerManager;

    constructor(layerManager: LayerManager) {
        this._layerManager = layerManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === "layer") {
            const serializedLayer = serialized as SerializedLayer<any>;
            const layer = LayerRegistry.makeLayer(serializedLayer.layerClass, this._layerManager);
            layer.getLayerDelegate().deserializeState(serializedLayer);
            layer.getItemDelegate().setId(serializedLayer.id);
            layer.getItemDelegate().setName(serializedLayer.name);
            return layer;
        }

        if (serialized.type === "view") {
            const serializedView = serialized as SerializedView;
            const view = new View(serializedView.name, this._layerManager, serializedView.color);
            view.deserializeState(serializedView);
            return view;
        }

        if (serialized.type === "settings-group") {
            const serializedSettingsGroup = serialized as SerializedSettingsGroup;
            const settingsGroup = new SettingsGroup(serializedSettingsGroup.name, this._layerManager);
            settingsGroup.deserializeState(serializedSettingsGroup);
            return settingsGroup;
        }

        if (serialized.type === "color-scale") {
            const serializedColorScale = serialized as SerializedColorScale;
            const colorScale = new ColorScale(serializedColorScale.name, this._layerManager);
            colorScale.deserializeState(serializedColorScale);
            return colorScale;
        }

        if (serialized.type === "delta-surface") {
            throw new Error("DeltaSurface deserialization not implemented");
        }

        if (serialized.type === "shared-setting") {
            const serializedSharedSetting = serialized as SerializedSharedSetting;
            const wrappedSetting = SettingRegistry.makeSetting(serializedSharedSetting.wrappedSettingClass);
            const setting = new SharedSetting(wrappedSetting, this._layerManager);
            setting.deserializeState(serializedSharedSetting);
            return setting;
        }

        throw new Error(`Unknown serialized item type: ${serialized.type}`);
    }
}
