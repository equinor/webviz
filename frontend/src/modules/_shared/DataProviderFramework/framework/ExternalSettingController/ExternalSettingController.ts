import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { GroupDelegate } from "../../delegates/GroupDelegate";
import { instanceofItemGroup, type Item } from "../../interfacesAndTypes/entities";
import { type Setting, type SettingTypeDefinitions } from "../../settings/settingsDefinitions";
import { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import { Group } from "../Group/Group";
import { type SettingManager, SettingTopic } from "../SettingManager/SettingManager";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export class ExternalSettingController<
    TSetting extends Setting,
    TInternalValue extends SettingTypeDefinitions[TSetting]["internalValue"] | null =
        | SettingTypeDefinitions[TSetting]["internalValue"]
        | null,
    TExternalValue extends SettingTypeDefinitions[TSetting]["externalValue"] | null =
        | SettingTypeDefinitions[TSetting]["externalValue"]
        | null,
    TValueConstraints extends
        SettingTypeDefinitions[TSetting]["valueConstraints"] = SettingTypeDefinitions[TSetting]["valueConstraints"],
> {
    private _parentItem: Item;
    private _setting: SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>;
    private _controlledSettings: Map<
        string,
        SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>
    > = new Map();
    private _valueConstraintsMap: Map<string, TValueConstraints | null> = new Map();
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _additionalControlledSetting: SettingManager<
        TSetting,
        TInternalValue,
        TExternalValue,
        TValueConstraints
    > | null = null;

    constructor(
        parentItem: Item,
        setting: SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>,
        additionalControlledSetting?: SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>,
    ) {
        this._parentItem = parentItem;
        this._setting = setting;
        this._additionalControlledSetting = additionalControlledSetting ?? null;

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE)(() => {
                this.unregisterAllControlledSettings();
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager.getPublishSubscribeDelegate().makeSubscriberFunction(DataProviderManagerTopic.ITEMS)(
                () => {
                    this.updateControlledSettings();
                },
            ),
        );
    }

    beforeDestroy(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        this.unregisterAllControlledSettings();
    }

    getParentItem(): Item {
        return this._parentItem;
    }

    registerSetting(settingManager: SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>): void {
        this._controlledSettings.set(settingManager.getId(), settingManager);
        settingManager.registerExternalSettingController(this);
    }

    getSetting(): SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints> {
        return this._setting;
    }

    private findControlledSettingsRecursively(
        groupDelegate: GroupDelegate,
        thisItem?: Item,
    ): SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>[] {
        let children = groupDelegate.getChildren();
        if (thisItem) {
            const position = children.indexOf(thisItem);
            if (position !== -1) {
                children = children.slice(position + 1, children.length);
            }
        }
        const foundSettings: SettingManager<TSetting, TInternalValue, TExternalValue, TValueConstraints>[] = [];

        for (const child of children) {
            if (child instanceof DataProvider) {
                const setting = child.getSettingsContextDelegate().getSettings()[this._setting.getType()];
                if (setting) {
                    foundSettings.push(setting);
                }
            } else if (child instanceof SharedSetting) {
                if (child === this._parentItem) {
                    continue;
                }
                const setting = child.getSharedSettingsDelegate().getWrappedSettings()[this._setting.getType()];
                if (setting) {
                    foundSettings.push(setting);
                    // A SharedSetting of the same type intercepts all subsequent siblings in this
                    // group: they are managed through that SharedSetting's own controller. Stop
                    // looking further in this group so we don't double-register those siblings.
                    break;
                }
            } else if (child instanceof Group) {
                const sharedSettingsDelegate = child.getSharedSettingsDelegate();
                if (sharedSettingsDelegate) {
                    const setting = sharedSettingsDelegate.getWrappedSettings()[this._setting.getType()];
                    if (setting) {
                        foundSettings.push(setting);
                        continue;
                    }
                }
                foundSettings.push(...this.findControlledSettingsRecursively(child.getGroupDelegate()));
            } else if (instanceofItemGroup(child)) {
                const group = child.getGroupDelegate();
                if (group) {
                    foundSettings.push(...this.findControlledSettingsRecursively(group));
                }
            }
        }

        return foundSettings;
    }

    private updateControlledSettings(): void {
        this.unregisterAllControlledSettings();

        let parentGroup = this._parentItem.getItemDelegate().getParentGroup();
        if (this._parentItem instanceof Group) {
            parentGroup = this._parentItem.getGroupDelegate();
        }

        if (!parentGroup) {
            this._setting.setLoading(false);
            this._setting.setValueConstraints(null);
            return;
        }

        const settings = this.findControlledSettingsRecursively(parentGroup, this._parentItem);

        // Add the additional controlled setting to the array if provided
        if (this._additionalControlledSetting) {
            settings.push(this._additionalControlledSetting);
        }

        for (const setting of settings) {
            if (setting.isExternallyControlled()) {
                continue;
            }
            // This order is paramount as we need to get the setting's value constraints before registering it
            // to not get the external setting controller's value constraints which are based on the controlled settings' value constraints -
            // which are not registered yet at this point.
            const valueConstraints = setting.getValueConstraints();
            this.registerSetting(setting);
            this._valueConstraintsMap.set(setting.getId(), valueConstraints);
        }

        if (this._controlledSettings.size === 0) {
            this._setting.setValueConstraints(null);
            this._setting.setLoading(false);
            return;
        }

        this.makeIntersectionOfValueConstraints();
    }

    unregisterAllControlledSettings(): void {
        for (const setting of this._controlledSettings.values()) {
            setting.unregisterExternalSettingController();
        }
        this._controlledSettings.clear();
        this._valueConstraintsMap.clear();
    }

    setValueConstraints(settingId: string, valueConstraints: TValueConstraints | null): void {
        this._valueConstraintsMap.set(settingId, valueConstraints);
        this.makeIntersectionOfValueConstraints();
    }

    private syncStateFromControlledSettings(): boolean {
        let hasLoading = false;
        let hasUninitialized = false;

        for (const setting of this._controlledSettings.values()) {
            if (setting.isLoading(true)) {
                hasLoading = true;
            }
            if (!setting.isInitialized(true)) {
                hasUninitialized = true;
            }
        }

        const shouldBeLoading = hasLoading || hasUninitialized;
        this._setting.setLoading(shouldBeLoading);

        return !shouldBeLoading;
    }

    makeIntersectionOfValueConstraints(): void {
        if (!this.syncStateFromControlledSettings()) {
            // Not ready yet — syncStateFromControlledSettings has already set loading=true on the
            // output setting. Do NOT call setValueConstraints(null) here: doing so would
            // force-initialize intermediate controlled settings with null, which cascades a fake
            // "ready" signal back up the chain before async dependencies have resolved.
            return;
        }

        const reducerDefinition = this._setting.getValueConstraintsReducerDefinition();

        if (this._setting.isStatic()) {
            this._setting.maybeResetPersistedValue();
            // As the setting is static, we need to notify the subscribers of the value change
            // as the shared setting might have a different value than its controlled settings
            // and setAvailableValues is not called in this case - which would notify the subscribers
            // of a possible value change.
            this._setting.getPublishSubscribeDelegate().notifySubscribers(SettingTopic.VALUE);
            this._setting.setLoading(false);
            return;
        }

        if (!reducerDefinition) {
            this._setting.setLoading(false);
            return;
        }

        const { reducer, startingValue, isValid } = reducerDefinition;
        let valueConstraints = startingValue;
        let index = 0;
        let isInvalid = false;

        for (const value of this._valueConstraintsMap.values()) {
            if (value === null) {
                isInvalid = true;
                break;
            }
            valueConstraints = reducer(valueConstraints, value, index++);
        }

        this._setting.setLoading(false);

        if (!isValid(valueConstraints as any) || isInvalid) {
            this._setting.setValueConstraints(null);
            return;
        }

        this._setting.setValueConstraints(valueConstraints);
    }
}
