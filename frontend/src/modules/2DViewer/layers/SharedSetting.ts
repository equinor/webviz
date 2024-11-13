import { LayerManager, LayerManagerTopic } from "./LayerManager";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { SettingTopic } from "./delegates/SettingDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Item, Layer, SerializedSharedSetting, Setting, instanceofLayer } from "./interfaces";

export class SharedSetting implements Item {
    private _wrappedSetting: Setting<any>;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _itemDelegate: ItemDelegate;

    constructor(wrappedSetting: Setting<any>, layerManager: LayerManager) {
        this._wrappedSetting = wrappedSetting;

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "setting",
            this._wrappedSetting
                .getDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                this.publishValueChange();
            })
        );
        this._itemDelegate = new ItemDelegate(wrappedSetting.getLabel(), layerManager);

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

        const layersAndSharedSettings = parentGroup.getDescendantItems(
            (item) => instanceofLayer(item) || item instanceof SharedSetting
        ) as Layer<any, any>[];
        let noSettingLoadingOrUninitialized = true;
        let index = 0;
        const availableValues = layersAndSharedSettings.reduce((acc, item) => {
            if (instanceofLayer(item)) {
                const setting = item.getLayerDelegate().getSettingsContext().getDelegate().getSettings()[
                    this._wrappedSetting.getType()
                ];
                if (setting) {
                    noSettingLoadingOrUninitialized =
                        noSettingLoadingOrUninitialized &&
                        !setting.getDelegate().isLoading() &&
                        setting.getDelegate().isInitialized();
                    if (index === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                    index++;
                }
            }
            if (
                item instanceof SharedSetting &&
                item.getItemDelegate().getId() !== this._itemDelegate.getId() &&
                item.getWrappedSetting().getType() === this._wrappedSetting.getType()
            ) {
                const setting = item.getWrappedSetting();
                if (setting) {
                    if (index === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                    index++;
                }
            }
            return acc;
        }, [] as any[]);

        if (!noSettingLoadingOrUninitialized) {
            this._wrappedSetting.getDelegate().setLoading(true);
            return;
        }

        this._wrappedSetting.getDelegate().setLoading(false);

        this._wrappedSetting.getDelegate().setAvailableValues(availableValues);
    }

    serializeState(): SerializedSharedSetting {
        return {
            ...this._itemDelegate.serializeState(),
            type: "shared-setting",
            wrappedSettingClass: this._wrappedSetting.constructor.name,
            settingType: this._wrappedSetting.getType(),
            value: this._wrappedSetting.getDelegate().serializeValue(),
        };
    }

    deserializeState(serialized: SerializedSharedSetting): void {
        this._itemDelegate.deserializeState(serialized);
        this._wrappedSetting.getDelegate().deserializeValue(serialized.value);
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
