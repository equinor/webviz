import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import { Item, SerializedSharedSetting, SerializedType, SharedSettingsProvider } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { Setting, SettingTypes } from "../../settings/settingsDefinitions";
import { DataLayerManager, LayerManagerTopic } from "../DataLayerManager/DataLayerManager";
import { SettingManager } from "../SettingManager/SettingManager";

export class SharedSetting<TSetting extends Setting> implements Item, SharedSettingsProvider {
    private _sharedSettingsDelegate: SharedSettingsDelegate<[TSetting]>;
    private _itemDelegate: ItemDelegate;

    constructor(wrappedSettingType: TSetting, defaultValue: SettingTypes[TSetting], layerManager: DataLayerManager) {
        const wrappedSetting = SettingRegistry.makeSetting(wrappedSettingType, defaultValue);
        this._itemDelegate = new ItemDelegate(wrappedSetting.getLabel(), 0, layerManager);

        const settingMap: { [K in TSetting]: SettingManager<K> } = {
            [wrappedSettingType]: wrappedSetting,
        } as unknown as { [K in TSetting]: SettingManager<K> };
        this._sharedSettingsDelegate = new SharedSettingsDelegate(this, settingMap);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getSharedSettingsDelegate(): SharedSettingsDelegate<any> {
        return this._sharedSettingsDelegate;
    }

    publishValueChange(): void {
        const layerManager = this._itemDelegate.getLayerManager();
        if (layerManager) {
            layerManager.publishTopic(LayerManagerTopic.SHARED_SETTINGS_CHANGED);
        }
    }

    getWrappedSetting(): SettingManager<TSetting> {
        return Object.values(this._sharedSettingsDelegate.getWrappedSettings())[0] as SettingManager<TSetting>;
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
