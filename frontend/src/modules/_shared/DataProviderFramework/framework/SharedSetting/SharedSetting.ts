import { isDevMode } from "@lib/utils/devMode";

import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import type { Item, SharedSettingsProvider } from "../../interfacesAndTypes/entities";
import type { SerializedSharedSetting } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { SettingRegistry } from "../../settings/SettingRegistry";
import type { Setting, SettingTypes } from "../../settings/settingsDefinitions";
import { type DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";

export function isSharedSetting(obj: any): obj is SharedSetting<any> {
    if (!isDevMode()) {
        return obj instanceof SharedSetting;
    }

    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    if (obj.constructor.name !== "SharedSetting") {
        return false;
    }
    return Boolean(obj.getSharedSettingsDelegate) && Boolean(!obj.getGroupDelegate);
}

export class SharedSetting<TSetting extends Setting> implements Item, SharedSettingsProvider {
    private _sharedSettingsDelegate: SharedSettingsDelegate<[TSetting]>;
    private _itemDelegate: ItemDelegate;

    constructor(
        wrappedSettingType: TSetting,
        defaultValue: SettingTypes[TSetting],
        dataProviderManager: DataProviderManager,
    ) {
        const wrappedSetting = SettingRegistry.makeSetting(wrappedSettingType, defaultValue);
        this._itemDelegate = new ItemDelegate(wrappedSetting.getLabel(), 0, dataProviderManager);

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
        this._sharedSettingsDelegate.beforeDestroy();
        this._sharedSettingsDelegate.unsubscribeAll();
    }
}
