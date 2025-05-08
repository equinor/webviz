import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import type { AvailableValuesType, MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
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

export class ExternalSettingController<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] = SettingTypes[TSetting],
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

    private updateControlledSettings(): void {
        this.unregisterAllControlledSettings();

        let parentGroup = this._parentItem.getItemDelegate().getParentGroup();
        if (this._parentItem instanceof Group) {
            parentGroup = this._parentItem.getGroupDelegate();
        }

        if (!parentGroup) {
            return;
        }

        const providers = parentGroup.getDescendantItems((item) => item instanceof DataProvider) as DataProvider<
            any,
            any
        >[];

        for (const provider of providers) {
            const setting = provider.getSettingsContextDelegate().getSettings()[this._setting.getType()];
            if (setting) {
                this._controlledSettings.set(setting.getId(), setting);
                this._availableValuesMap.set(setting.getId(), setting.getAvailableValues());
                setting.registerExternalSettingController(this);
            }
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
        const category = this._setting.getCategory();
        const reducerDefinition = settingCategoryAvailableValuesIntersectionReducerMap[category];

        if (!reducerDefinition) {
            throw new Error(
                `No reducer definition found for category ${category}. Please check the settings definitions.`,
            );
        }

        const { reducer, startingValue, isValid } = reducerDefinition;
        let availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> =
            startingValue as MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>;
        let index = 0;

        for (const value of this._availableValuesMap.values()) {
            if (value === null) {
                continue;
            }
            availableValues = reducer(
                availableValues as any,
                value as any,
                index++,
            ) as MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>;
        }

        if (!isValid(availableValues as any)) {
            this._setting.setAvailableValues(null);
            return;
        }

        this._setting.setAvailableValues(availableValues);
    }
}
