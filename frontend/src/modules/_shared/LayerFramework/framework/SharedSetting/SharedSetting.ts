import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import { Item, SerializedSharedSetting, SerializedType } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { Setting, SettingTypes } from "../../settings/settingsTypes";
import { DataLayerManager, LayerManagerTopic } from "../DataLayerManager/DataLayerManager";
import { SettingManager } from "../SettingManager/Setting";

export class SharedSetting<TSettingType extends Setting> implements Item {
    private _sharedSettingsDelegate: SharedSettingsDelegate<[TSettingType]>;
    private _itemDelegate: ItemDelegate;

    constructor(
        wrappedSettingType: TSettingType,
        defaultValue: SettingTypes[TSettingType],
        layerManager: DataLayerManager
    ) {
        const wrappedSetting = SettingRegistry.makeSetting(wrappedSettingType, defaultValue);
        this._itemDelegate = new ItemDelegate(wrappedSetting.getLabel(), 0, layerManager);
        this._sharedSettingsDelegate = new SharedSettingsDelegate([wrappedSetting], this);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    publishValueChange(): void {
        const layerManager = this._itemDelegate.getLayerManager();
        if (layerManager) {
            layerManager.publishTopic(LayerManagerTopic.SHARED_SETTINGS_CHANGED);
        }
    }

    getWrappedSetting(): SettingManager<any> {
        return this._sharedSettingsDelegate.getWrappedSettings()[0];
    }

    serializeState(): SerializedSharedSetting {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.SHARED_SETTING,
            wrappedSettingType: this.getWrappedSetting().getType(),
            value: this.getWrappedSetting().serializeValue(),
        };
    }

    deserializeState(serialized: SerializedSharedSetting): void {
        this._itemDelegate.deserializeState(serialized);
        this.getWrappedSetting().deserializeValue(serialized.value);
    }

    beforeDestroy(): void {
        this._sharedSettingsDelegate.unsubscribeAll();
    }
}
