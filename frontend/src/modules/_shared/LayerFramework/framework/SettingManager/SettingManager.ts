import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { PublishSubscribe } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
import type { SharedSettingsProvider } from "../../interfacesAndTypes/entitites";
import type { AvailableValuesType, MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { Setting, SettingCategories, SettingCategory, SettingTypes } from "../../settings/settingsDefinitions";
import { settingCategoryFixupMap, settingCategoryIsValueValidMap } from "../../settings/settingsDefinitions";
import { Group } from "../Group/Group";

export enum SettingTopic {
    VALUE = "VALUE",
    IS_VALID = "IS_VALID",
    AVAILABLE_VALUES = "AVAILABLE_VALUES",
    OVERRIDDEN_VALUE = "OVERRIDDEN_VALUE",
    OVERRIDDEN_VALUE_PROVIDER = "OVERRIDDEN_VALUE_PROVIDER",
    IS_LOADING = "IS_LOADING",
    IS_INITIALIZED = "IS_INITIALIZED",
    IS_PERSISTED = "IS_PERSISTED",
}

export type SettingTopicPayloads<TValue, TCategory extends SettingCategory> = {
    [SettingTopic.VALUE]: TValue;
    [SettingTopic.IS_VALID]: boolean;
    [SettingTopic.AVAILABLE_VALUES]: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> | null;
    [SettingTopic.OVERRIDDEN_VALUE]: TValue | undefined;
    [SettingTopic.OVERRIDDEN_VALUE_PROVIDER]: OverriddenValueProviderType | undefined;
    [SettingTopic.IS_LOADING]: boolean;
    [SettingTopic.IS_INITIALIZED]: boolean;
    [SettingTopic.IS_PERSISTED]: boolean;
};

export type SettingManagerParams<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] | null,
    TCategory extends SettingCategories[TSetting]
> = {
    type: TSetting;
    category: TCategory;
    label: string;
    defaultValue: TValue;
    customSettingImplementation: CustomSettingImplementation<TValue, TCategory>;
};

export enum OverriddenValueProviderType {
    GROUP = "GROUP",
    SHARED_SETTING = "SHARED_SETTING",
}

/*
 * The Setting class is responsible for managing a setting.
 *
 * It provides a method for setting available values, which are used to validate the setting value or applying a fixup if the value is invalid.
 * It provides methods for setting and getting the value and its states, checking if the value is valid, and setting the value as overridden or persisted.
 */
export class SettingManager<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] = SettingTypes[TSetting],
    TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting]
> implements PublishSubscribe<SettingTopicPayloads<TValue, TCategory>>
{
    private _id: string;
    private _type: TSetting;
    private _category: TCategory;
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<TValue, TCategory>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingTopicPayloads<TValue, TCategory>>();
    private _availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> | null = null;
    private _overriddenValue: TValue | undefined = undefined;
    private _overriddenValueProviderType: OverriddenValueProviderType | undefined = undefined;
    private _loading: boolean = false;
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TValue | null = null;
    private _isStatic: boolean;

    constructor({
        type,
        category,
        customSettingImplementation,
        defaultValue,
        label,
    }: SettingManagerParams<TSetting, TValue, TCategory>) {
        this._id = v4();
        this._type = type;
        this._category = category;
        this._label = label;
        this._customSettingImplementation = customSettingImplementation;
        this._value = defaultValue;
        this._isStatic = customSettingImplementation.getIsStatic?.() ?? false;
        if (this._isStatic) {
            this.setValueValid(this.checkIfValueIsValid(this._value));
        }
    }

    getId(): string {
        return this._id;
    }

    getType(): Setting {
        return this._type;
    }

    getCategory(): TCategory {
        return this._category;
    }

    getLabel(): string {
        return this._label;
    }

    getValue(): TValue {
        if (this._overriddenValue !== undefined) {
            return this._overriddenValue;
        }

        if (this._currentValueFromPersistence !== null) {
            return this._currentValueFromPersistence;
        }

        return this._value;
    }

    isStatic(): boolean {
        return this._isStatic;
    }

    serializeValue(): string {
        if (this._customSettingImplementation.serializeValue) {
            return this._customSettingImplementation.serializeValue(this.getValue());
        }

        return JSON.stringify(this.getValue());
    }

    deserializeValue(serializedValue: string): void {
        if (this._customSettingImplementation.deserializeValue) {
            this._currentValueFromPersistence = this._customSettingImplementation.deserializeValue(serializedValue);
            return;
        }

        this._currentValueFromPersistence = JSON.parse(serializedValue);
    }

    isValueValid(): boolean {
        return this._isValueValid;
    }

    isPersistedValue(): boolean {
        return this._currentValueFromPersistence !== null;
    }

    /*
     * This method is used to set the value of the setting.
     * It should only be called when a user is changing a setting.
     */
    setValue(value: TValue): void {
        if (isEqual(this._value, value)) {
            return;
        }
        this._currentValueFromPersistence = null;
        this._value = value;

        this.setValueValid(this.checkIfValueIsValid(this._value));

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
    }

    setValueValid(isValueValid: boolean): void {
        if (this._isValueValid === isValueValid) {
            return;
        }
        this._isValueValid = isValueValid;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_VALID);
    }

    setLoading(loading: boolean): void {
        if (this._loading === loading) {
            return;
        }
        this._loading = loading;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_LOADING);
    }

    initialize(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_INITIALIZED);
    }

    isInitialized(): boolean {
        return this._initialized || this._isStatic;
    }

    isLoading(): boolean {
        return this._loading;
    }

    valueToRepresentation(
        value: TValue,
        workbenchSession: WorkbenchSession,
        workbenchSettings: WorkbenchSettings
    ): React.ReactNode {
        if (this._customSettingImplementation.overriddenValueRepresentation) {
            return this._customSettingImplementation.overriddenValueRepresentation({
                value,
                workbenchSession,
                workbenchSettings,
            });
        }

        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }

        if (typeof value === "string") {
            return value;
        }

        if (typeof value === "number") {
            return value.toString();
        }

        return "Value has no string representation";
    }

    checkForOverrides(sharedSettingsProviders: SharedSettingsProvider[]) {
        let overriddenValue: TValue | undefined;
        let overriddenValueProviderType: OverriddenValueProviderType | undefined;

        for (const provider of sharedSettingsProviders) {
            if (!provider.getSharedSettingsDelegate()) {
                continue;
            }
            for (const sharedSettingKey in provider.getSharedSettingsDelegate().getWrappedSettings()) {
                const sharedSetting = provider.getSharedSettingsDelegate().getWrappedSettings()[sharedSettingKey];
                if (sharedSetting.getType() === this._type) {
                    overriddenValue = sharedSetting.getValue();
                    overriddenValueProviderType = OverriddenValueProviderType.SHARED_SETTING;
                    if (provider instanceof Group) {
                        overriddenValueProviderType = OverriddenValueProviderType.GROUP;
                    }
                    break;
                }
            }
        }

        this.setOverriddenValue(overriddenValue);
        this._overriddenValueProviderType = overriddenValueProviderType;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.OVERRIDDEN_VALUE_PROVIDER);
    }

    setOverriddenValue(overriddenValue: TValue | undefined): void {
        if (isEqual(this._overriddenValue, overriddenValue)) {
            return;
        }

        const prevValue = this._overriddenValue;
        this._overriddenValue = overriddenValue;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.OVERRIDDEN_VALUE);

        if (overriddenValue === undefined) {
            // Keep overridden value, if invalid fix it
            if (prevValue !== undefined) {
                this._value = prevValue;
            }
            this.maybeFixupValue();
        }

        this.setValueValid(this.checkIfValueIsValid(this.getValue()));

        if (prevValue === undefined && overriddenValue !== undefined && isEqual(this._value, overriddenValue)) {
            return;
        }

        if (prevValue !== undefined && overriddenValue === undefined && isEqual(this._value, prevValue)) {
            return;
        }

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
    }

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TValue, TCategory>[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case SettingTopic.VALUE:
                    return this.getValue();
                case SettingTopic.IS_VALID:
                    return this._isValueValid;
                case SettingTopic.AVAILABLE_VALUES:
                    return this._availableValues;
                case SettingTopic.OVERRIDDEN_VALUE:
                    return this._overriddenValue;
                case SettingTopic.OVERRIDDEN_VALUE_PROVIDER:
                    return this._overriddenValueProviderType;
                case SettingTopic.IS_LOADING:
                    return this.isLoading();
                case SettingTopic.IS_PERSISTED:
                    return this.isPersistedValue();
                case SettingTopic.IS_INITIALIZED:
                    return this.isInitialized();
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    getAvailableValues(): AvailableValuesType<TSetting> | null {
        return this._availableValues;
    }

    maybeResetPersistedValue(): boolean {
        if (this._isStatic) {
            if (this._currentValueFromPersistence !== null) {
                this._value = this._currentValueFromPersistence;
                this._currentValueFromPersistence = null;
                this.setValueValid(true);
            }
            return true;
        }
        if (this._currentValueFromPersistence === null || this._availableValues === null) {
            return false;
        }

        let isPersistedValueValid = false;

        const customIsValueValidFunction = this._customSettingImplementation.isValueValid;
        if (customIsValueValidFunction) {
            isPersistedValueValid = customIsValueValidFunction(
                this._currentValueFromPersistence,
                this._availableValues
            );
        } else {
            isPersistedValueValid = settingCategoryIsValueValidMap[this._category](
                this._currentValueFromPersistence as any,
                this._availableValues as any
            );
        }

        if (isPersistedValueValid) {
            this._value = this._currentValueFromPersistence;
            this._currentValueFromPersistence = null;
            this.setValueValid(true);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.IS_PERSISTED);
            return true;
        }

        return false;
    }

    setAvailableValues(availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>): void {
        if (isEqual(this._availableValues, availableValues) && this._initialized) {
            return;
        }

        this._availableValues = availableValues;
        let valueChanged = false;
        if ((!this.checkIfValueIsValid(this.getValue()) && this.maybeFixupValue()) || this.maybeResetPersistedValue()) {
            valueChanged = true;
        }
        const prevIsValid = this._isValueValid;
        this.setValueValid(this.checkIfValueIsValid(this.getValue()));
        this.initialize();
        if (valueChanged || this._isValueValid !== prevIsValid) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE);
        }
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.AVAILABLE_VALUES);
    }

    makeComponent() {
        return this._customSettingImplementation.makeComponent();
    }

    private maybeFixupValue(): boolean {
        if (this.checkIfValueIsValid(this._value)) {
            return false;
        }

        if (this.isPersistedValue()) {
            return false;
        }

        if (this._availableValues === null) {
            return false;
        }

        let candidate: TValue;
        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._value, this._availableValues);
        } else {
            candidate = settingCategoryFixupMap[this._category](
                this._value as any,
                this._availableValues as any
            ) as TValue;
        }

        if (isEqual(candidate, this._value)) {
            return false;
        }
        this._value = candidate;
        return true;
    }

    private checkIfValueIsValid(value: TValue): boolean {
        if (value === null) {
            return false;
        }
        if (this._isStatic) {
            return true;
        }
        if (this._availableValues === null) {
            return false;
        }
        if (this._customSettingImplementation.isValueValid) {
            return this._customSettingImplementation.isValueValid(value, this._availableValues);
        } else {
            return settingCategoryIsValueValidMap[this._category](value as any, this._availableValues as any);
        }
    }
}
