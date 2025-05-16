import type { GroupDelegate } from "../../delegates/GroupDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import { instanceofItemGroup, type Item } from "../../interfacesAndTypes/entities";
import type { AvailableValuesType } from "../../interfacesAndTypes/utils";
import {
    type Setting,
    type SettingCategories,
    type SettingTypes,
    settingCategoryAvailableValuesIntersectionReducerMap,
} from "../../settings/settingsDefinitions";
import { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import { Group } from "../Group/Group";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SharedSetting } from "../SharedSetting/SharedSetting";

export class ExternalSettingController<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] | null = SettingTypes[TSetting] | null,
    TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting],
> {
    private _parentItem: Item;
    private _setting: SettingManager<TSetting, TValue, TCategory>;
    private _controlledSettings: Map<string, SettingManager<TSetting, TValue, TCategory>> = new Map();
    private _availableValuesMap: Map<string, AvailableValuesType<TSetting>> = new Map();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(parentItem: Item, setting: SettingManager<TSetting, TValue, TCategory>) {
        this._parentItem = parentItem;
        this._setting = setting;

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE)(() => {
                this.unregisterAllControlledSettings();
            }),
        );
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager.getPublishSubscribeDelegate().makeSubscriberFunction(DataProviderManagerTopic.ITEMS)(
                () => {
                    this.updateControlledSettings();
                },
            ),
        );
    }

    beforeDestroy(): void {
        this._unsubscribeHandler.unsubscribeAll();
        this.unregisterAllControlledSettings();
    }

    getParentItem(): Item {
        return this._parentItem;
    }

    registerSetting(settingManager: SettingManager<TSetting, TValue, TCategory>): void {
        this._controlledSettings.set(settingManager.getId(), settingManager);
        settingManager.registerExternalSettingController(this);
    }

    getSetting(): SettingManager<TSetting, TValue, TCategory> {
        return this._setting;
    }

    private findControlledSettingsRecursively(
        groupDelegate: GroupDelegate,
        thisItem?: Item,
    ): SettingManager<TSetting, TValue, TCategory>[] {
        let children = groupDelegate.getChildren();
        if (thisItem) {
            const position = children.indexOf(thisItem);
            if (position !== -1) {
                children = children.slice(position + 1, children.length);
            }
        }
        const foundSettings: SettingManager<TSetting, TValue, TCategory>[] = [];

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
                    break;
                }
            } else if (child instanceof Group) {
                const sharedSettingsDelegate = child.getSharedSettingsDelegate();
                if (sharedSettingsDelegate) {
                    const setting = sharedSettingsDelegate.getWrappedSettings()[this._setting.getType()];
                    if (setting) {
                        foundSettings.push(setting);
                        break;
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
        let parentGroup = this._parentItem.getItemDelegate().getParentGroup();
        if (this._parentItem instanceof Group) {
            parentGroup = this._parentItem.getGroupDelegate();
        }

        if (!parentGroup) {
            return;
        }

        const settings = this.findControlledSettingsRecursively(parentGroup, this._parentItem);
        for (const setting of settings) {
            if (setting.isExternallyControlled()) {
                continue;
            }
            this._controlledSettings.set(setting.getId(), setting);
            this._availableValuesMap.set(
                setting.getId(),
                setting.getAvailableValues() as AvailableValuesType<TSetting>,
            );
            setting.registerExternalSettingController(this);
        }

        if (this._controlledSettings.size === 0) {
            this._setting.setAvailableValues(null);
            return;
        }

        this.makeIntersectionOfAvailableValues();
    }

    unregisterAllControlledSettings(): void {
        for (const setting of this._controlledSettings.values()) {
            setting.unregisterExternalSettingController();
        }
        this._controlledSettings.clear();
        this._availableValuesMap.clear();
    }

    setAvailableValues(settingId: string, availableValues: AvailableValuesType<TSetting> | null): void {
        if (availableValues) {
            this._availableValuesMap.set(settingId, availableValues);
        } else {
            this._availableValuesMap.delete(settingId);
        }

        this.makeIntersectionOfAvailableValues();
    }

    makeIntersectionOfAvailableValues(): void {
        for (const setting of this._controlledSettings.values()) {
            if (!setting.isInitialized(true) || setting.isLoading(true)) {
                return;
            }
        }

        const category = this._setting.getCategory();
        const reducerDefinition = settingCategoryAvailableValuesIntersectionReducerMap[category];

        if (this._setting.isStatic()) {
            this._setting.maybeResetPersistedValue();
            return;
        }

        if (!reducerDefinition) {
            return;
        }

        const { reducer, startingValue, isValid } = reducerDefinition;
        let availableValues: AvailableValuesType<TSetting> = startingValue as AvailableValuesType<TSetting>;
        let index = 0;
        let isInvalid = false;

        for (const value of this._availableValuesMap.values()) {
            if (value === null) {
                isInvalid = true;
                break;
            }
            availableValues = reducer(availableValues as any, value as any, index++) as AvailableValuesType<TSetting>;
        }

        if (!isValid(availableValues as any) || isInvalid) {
            this._setting.setAvailableValues(null);
            this._setting.setValue(null as any);
            return;
        }

        this._setting.setAvailableValues(availableValues);
    }
}
