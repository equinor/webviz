import { LayerManager, LayerManagerTopic } from "./LayerManager";
import { ItemDelegate, ItemDelegateTopic } from "./delegates/ItemDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Item, Layer, SerializedSharedSetting, Setting, SettingTopic, instanceofLayer } from "./interfaces";

export class SharedSetting implements Item {
    private _wrappedSetting: Setting<any>;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _itemDelegate: ItemDelegate;

    constructor(wrappedSetting: Setting<any>) {
        this._wrappedSetting = wrappedSetting;
        this._wrappedSetting
            .getDelegate()
            .getPublishSubscribeHandler()
            .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
            this.publishValueChange();
        });
        this._itemDelegate = new ItemDelegate(wrappedSetting.getLabel());
        this._itemDelegate.getPublishSubscribeHandler().makeSubscriberFunction(ItemDelegateTopic.LAYER_MANAGER)(() => {
            this.handleLayerManagerChange(this._itemDelegate.getLayerManager());
        });
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    handleLayerManagerChange(layerManager: LayerManager | null): void {
        if (layerManager) {
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "layer-manager",
                layerManager.getPublishSubscribeHandler().makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(
                    () => {
                        this.makeIntersectionOfAvailableValues();
                    }
                )
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "layer-manager",
                layerManager.getPublishSubscribeHandler().makeSubscriberFunction(LayerManagerTopic.SETTINGS_CHANGED)(
                    () => {
                        this.makeIntersectionOfAvailableValues();
                    }
                )
            );
            this._unsubscribeHandler.registerUnsubscribeFunction(
                "layer-manager",
                layerManager
                    .getPublishSubscribeHandler()
                    .makeSubscriberFunction(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED)(() => {
                    this.makeIntersectionOfAvailableValues();
                })
            );
        } else {
            this._unsubscribeHandler.unsubscribe("layer-manager");
        }
    }

    publishValueChange(): void {
        const layerManager = this._itemDelegate.getLayerManager();
        if (layerManager) {
            layerManager.publishTopic(LayerManagerTopic.SETTINGS_CHANGED);
        }
    }

    getWrappedSetting(): Setting<any> {
        return this._wrappedSetting;
    }

    private makeIntersectionOfAvailableValues(): void {
        const parentGroup = this._itemDelegate.getParentGroup();
        if (!parentGroup) {
            throw new Error("Parent group not set");
        }

        const layersAndSharedSettings = parentGroup.getDescendantItems(
            (item) => instanceofLayer(item) || item instanceof SharedSetting
        ) as Layer<any, any>[];
        const availableValues = layersAndSharedSettings.reduce((acc, item) => {
            if (instanceofLayer(item)) {
                const setting = item.getLayerDelegate().getSettingsContext().getDelegate().getSettings()[
                    this._wrappedSetting.getType()
                ];
                if (setting) {
                    if (acc.length === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                }
            }
            if (
                item instanceof SharedSetting &&
                item.getItemDelegate().getId() !== this._itemDelegate.getId() &&
                item.getWrappedSetting().getType() === this._wrappedSetting.getType()
            ) {
                const setting = item.getWrappedSetting();
                if (setting) {
                    if (acc.length === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                }
            }
            return acc;
        }, [] as any[]);

        this._wrappedSetting.getDelegate().setAvailableValues(availableValues);
    }

    serializeState(): SerializedSharedSetting {
        return {
            id: this._itemDelegate.getId(),
            name: this._itemDelegate.getName(),
            type: "shared-setting",
            settingType: this._wrappedSetting.getType(),
            value: this._wrappedSetting.getDelegate().serializeValue(),
        };
    }
}
