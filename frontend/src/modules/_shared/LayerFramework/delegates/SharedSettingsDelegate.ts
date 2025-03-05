import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { DataLayer } from "../framework/DataLayer/DataLayer";
import { LayerManagerTopic } from "../framework/DataLayerManager/DataLayerManager";
import { Group } from "../framework/Group/Group";
import { SettingTopic } from "../framework/Setting/Setting";
import { AvailableValuesType, Item } from "../interfaces";
import { MakeSettingTuple, SettingTypes } from "../settings/settingsTypes";

export class SharedSettingsDelegate<
    TSettingTypes extends readonly (keyof SettingTypes)[],
    TSettings extends MakeSettingTuple<TSettingTypes> = MakeSettingTuple<TSettingTypes>
> {
    private _parentItem: Item;
    private _wrappedSettings: TSettings;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(wrappedSettings: TSettings, parentItem: Item) {
        this._wrappedSettings = wrappedSettings;
        this._parentItem = parentItem;

        const layerManager = parentItem.getItemDelegate().getLayerManager();
        if (!layerManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a layer manager.");
        }

        for (const setting of wrappedSettings) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "setting",
                setting.getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                    this.publishValueChange();
                })
            );
        }

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(() => {
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

    getWrappedSettings(): TSettings {
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
        const availableValuesMap: { [K in TSettingTypes[number]]: AvailableValuesType<SettingTypes[K]> } = {} as {
            [K in TSettingTypes[number]]: AvailableValuesType<SettingTypes[K]>;
        };
        const indices: { [K in TSettingTypes[number]]: number } = {} as { [K in TSettingTypes[number]]: number };

        for (const item of layers) {
            for (const wrappedSetting of this._wrappedSettings) {
                const index = indices[wrappedSetting.getType() as TSettingTypes[number]] ?? 0;
                const setting = item.getSettingsContextDelegate().getSettings()[wrappedSetting.getType()];
                if (setting) {
                    if (setting.isLoading()) {
                        this._wrappedSettings[index].setLoading(true);
                        return;
                    }
                    if (index === 0) {
                        availableValuesMap[wrappedSetting.getType() as TSettingTypes[number]] =
                            setting.getAvailableValues() as AvailableValuesType<SettingTypes[TSettingTypes[number]]>;
                    } else {
                        availableValuesMap[setting.getType() as TSettingTypes[number]] = availableValuesMap[
                            setting.getType() as TSettingTypes[number]
                        ].filter((value) => setting.getAvailableValues().includes(value)) as AvailableValuesType<
                            SettingTypes[TSettingTypes[number]]
                        >;
                    }
                    indices[wrappedSetting.getType() as TSettingTypes[number]] = index + 1;
                }
            }
        }

        for (const wrappedSetting of this._wrappedSettings) {
            wrappedSetting.setLoading(false);
            wrappedSetting.setAvailableValues(
                availableValuesMap[wrappedSetting.getType() as TSettingTypes[number]] ?? []
            );
            this.publishValueChange();
        }
    }

    unsubscribeAll(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
