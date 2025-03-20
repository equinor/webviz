import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { DataLayer } from "../framework/DataLayer/DataLayer";
import { LayerManagerTopic } from "../framework/DataLayerManager/DataLayerManager";
import { Group } from "../framework/Group/Group";
import { SettingManager, SettingTopic } from "../framework/SettingManager/SettingManager";
import { Item } from "../interfacesAndTypes/entitites";
import { AvailableValuesType, SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import {
    SettingTypes,
    Settings,
    settingCategoryAvailableValuesIntersectionReducerMap,
} from "../settings/settingsDefinitions";

export class SharedSettingsDelegate<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>
> {
    private _parentItem: Item;
    private _wrappedSettings: { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } = {} as {
        [K in TSettingKey]: SettingManager<K, SettingTypes[K]>;
    };
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(parentItem: Item, wrappedSettings: { [K in TSettingKey]: SettingManager<K> }) {
        this._wrappedSettings = wrappedSettings;
        this._parentItem = parentItem;

        const layerManager = parentItem.getItemDelegate().getLayerManager();
        if (!layerManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a layer manager.");
        }

        for (const key in wrappedSettings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "setting",
                wrappedSettings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(
                    () => {
                        this.publishValueChange();
                    }
                )
            );
        }

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.ITEMS)(() => {
                this.makeIntersectionOfAvailableValues();
            })
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.SETTINGS_CHANGED)(
                () => {
                    this.makeIntersectionOfAvailableValues();
                }
            )
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED)(() => {
                this.makeIntersectionOfAvailableValues();
            })
        );
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } {
        return this._wrappedSettings;
    }

    publishValueChange(): void {
        const layerManager = this._parentItem.getItemDelegate().getLayerManager();
        if (layerManager) {
            layerManager.publishTopic(LayerManagerTopic.SHARED_SETTINGS_CHANGED);
        }
    }

    private makeIntersectionOfAvailableValues(): void {
        let parentGroup = this._parentItem.getItemDelegate().getParentGroup();
        if (this._parentItem instanceof Group) {
            parentGroup = this._parentItem.getGroupDelegate();
        }

        if (!parentGroup) {
            return;
        }

        const layers = parentGroup.getDescendantItems((item) => item instanceof DataLayer) as DataLayer<any, any>[];
        const availableValuesMap: { [K in TSettingKey]: AvailableValuesType<K> } = {} as {
            [K in TSettingKey]: AvailableValuesType<K>;
        };
        const indices: { [K in TSettingKey]: number } = {} as { [K in TSettings[number]]: number };

        for (const item of layers) {
            for (const key in this._wrappedSettings) {
                const wrappedSetting = this._wrappedSettings[key];
                const category = wrappedSetting.getCategory();
                const index = indices[key] ?? 0;
                const setting = item.getSettingsContextDelegate().getSettings()[wrappedSetting.getType()];
                if (setting) {
                    if (setting.isLoading()) {
                        wrappedSetting.setLoading(true);
                        continue;
                    }

                    if (setting.getAvailableValues() === null) {
                        continue;
                    }

                    const reducerDefinition = settingCategoryAvailableValuesIntersectionReducerMap[category];
                    if (reducerDefinition) {
                        const { reducer, startingValue } = reducerDefinition;
                        if (index === 0) {
                            availableValuesMap[key] = startingValue as AvailableValuesType<typeof key>;
                        }
                        availableValuesMap[key] = reducer(
                            availableValuesMap[key] as any,
                            setting.getAvailableValues(),
                            index
                        ) as AvailableValuesType<typeof key>;
                    }
                    indices[key] = index + 1;
                }
            }
        }

        for (const key in this._wrappedSettings) {
            const wrappedSetting = this._wrappedSettings[key];
            wrappedSetting.setLoading(false);
            wrappedSetting.setAvailableValues(availableValuesMap[key] ?? []);
            this.publishValueChange();
        }
    }

    unsubscribeAll(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
