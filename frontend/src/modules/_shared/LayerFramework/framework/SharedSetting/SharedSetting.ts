import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingTopic } from "../../delegates/SettingDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import { AvailableValuesType, Item, SerializedSharedSetting, SerializedType } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { SettingType, SettingTypes } from "../../settings/settingsTypes";
import { DataLayer } from "../DataLayer/DataLayer";
import { DataLayerManager, LayerManagerTopic } from "../DataLayerManager/DataLayerManager";
import { Setting } from "../Setting/Setting";

export class SharedSetting<TSettingType extends SettingType> implements Item {
    private _wrappedSetting: Setting<SettingTypes[TSettingType]>;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _itemDelegate: ItemDelegate;

    constructor(
        wrappedSettingType: TSettingType,
        defaultValue: SettingTypes[TSettingType],
        layerManager: DataLayerManager
    ) {
        this._wrappedSetting = SettingRegistry.makeSetting(wrappedSettingType, defaultValue);

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "setting",
            this._wrappedSetting.getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(
                () => {
                    this.publishValueChange();
                }
            )
        );
        this._itemDelegate = new ItemDelegate(this._wrappedSetting.getLabel(), 0, layerManager);

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

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    publishValueChange(): void {
        const layerManager = this._itemDelegate.getLayerManager();
        if (layerManager) {
            layerManager.publishTopic(LayerManagerTopic.SHARED_SETTINGS_CHANGED);
        }
    }

    getWrappedSetting(): Setting<any> {
        return this._wrappedSetting;
    }

    private makeIntersectionOfAvailableValues(): void {
        const parentGroup = this._itemDelegate.getParentGroup();
        if (!parentGroup) {
            return;
        }

        const layers = parentGroup.getDescendantItems((item) => item instanceof DataLayer) as DataLayer<any, any>[];
        let index = 0;
        let availableValues: AvailableValuesType<SettingTypes[TSettingType]> = [] as unknown as AvailableValuesType<
            SettingTypes[TSettingType]
        >;
        for (const item of layers) {
            const setting = item.getSettingsContextDelegate().getSettings()[this._wrappedSetting.getType()];
            if (setting) {
                if (setting.isLoading()) {
                    this._wrappedSetting.setLoading(true);
                    return;
                }
                if (index === 0) {
                    availableValues.push(...setting.getAvailableValues());
                } else {
                    availableValues = availableValues.filter((value) =>
                        setting.getAvailableValues().includes(value)
                    ) as unknown as AvailableValuesType<SettingTypes[TSettingType]>;
                }
                index++;
            }
        }

        this._wrappedSetting.setLoading(false);

        this._wrappedSetting.setAvailableValues(availableValues);
        this.publishValueChange();
    }

    serializeState(): SerializedSharedSetting {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.SHARED_SETTING,
            wrappedSettingType: this._wrappedSetting.getType(),
            value: this._wrappedSetting.serializeValue(),
        };
    }

    deserializeState(serialized: SerializedSharedSetting): void {
        this._itemDelegate.deserializeState(serialized);
        this._wrappedSetting.deserializeValue(serialized.value);
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
