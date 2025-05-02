
import { ExternalSettingController } from "../framework/ExternalSettingController/ExternalSettingController";
import type { SettingManager } from "../framework/SettingManager/SettingManager";
import type { Item } from "../interfacesAndTypes/entities";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { SettingTypes, Settings } from "../settings/settingsDefinitions";

import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

export class SharedSettingsDelegate<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    private _parentItem: Item;
    private _externalSettingControllers: { [K in TSettingKey]: ExternalSettingController<K> } = {} as {
        [K in TSettingKey]: ExternalSettingController<K>;
    };
    private _wrappedSettings: { [K in TSettingKey]: SettingManager<K> } = {} as {
        [K in TSettingKey]: SettingManager<K>;
    };
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(parentItem: Item, wrappedSettings: { [K in TSettingKey]: SettingManager<K> }) {
        this._parentItem = parentItem;
        this._wrappedSettings = wrappedSettings;

        for (const key in wrappedSettings) {
            const setting = wrappedSettings[key];
            const externalSettingController = new ExternalSettingController(parentItem, setting);
            this._externalSettingControllers[key] = externalSettingController;
        }

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        if (!dataProviderManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a data provider manager.");
        }
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } {
        return this._wrappedSettings;
    }

    unsubscribeAll(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
