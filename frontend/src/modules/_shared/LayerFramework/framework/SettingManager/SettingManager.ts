import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import {
    AvailableValuesType,
    CustomSettingImplementation,
    MakeAvailableValuesTypeBasedOnCategory,
    SharedSettingsProvider,
} from "../../interfaces";
import {
    Setting,
    SettingCategories,
    SettingCategory,
    SettingTypes,
    settingCategoryFixupMap,
    settingCategoryIsValueValidMap,
} from "../../settings/settingsDefinitions";
import { Group } from "../Group/Group";

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
    VALIDITY_CHANGED = "VALIDITY_CHANGED",
    AVAILABLE_VALUES_CHANGED = "AVAILABLE_VALUES_CHANGED",
    OVERRIDDEN_VALUE_CHANGED = "OVERRIDDEN_VALUE_CHANGED",
    OVERRIDDEN_VALUE_PROVIDER_CHANGED = "OVERRIDDEN_VALUE_PROVIDER_CHANGED",
    LOADING_STATE_CHANGED = "LOADING_STATE_CHANGED",
    INIT_STATE_CHANGED = "INIT_STATE_CHANGED",
    PERSISTED_STATE_CHANGED = "PERSISTED_STATE_CHANGED",
}

export type SettingTopicPayloads<TValue, TCategory extends SettingCategory> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
    [SettingTopic.VALIDITY_CHANGED]: boolean;
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>;
    [SettingTopic.OVERRIDDEN_VALUE_CHANGED]: TValue | undefined;
    [SettingTopic.OVERRIDDEN_VALUE_PROVIDER_CHANGED]: OverriddenValueProviderType | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
    [SettingTopic.INIT_STATE_CHANGED]: boolean;
    [SettingTopic.PERSISTED_STATE_CHANGED]: boolean;
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
    private _availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> =
        [] as unknown as MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>;
    private _overriddenValue: TValue | undefined = undefined;
    private _overridenValueProviderType: OverriddenValueProviderType | undefined = undefined;
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
        if (typeof this._value === "boolean") {
            this._isValueValid = true;
        }

        this._isStatic = customSettingImplementation.getIsStatic?.() ?? false;
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

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    setValueValid(isValueValid: boolean): void {
        if (this._isValueValid === isValueValid) {
            return;
        }
        this._isValueValid = isValueValid;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALIDITY_CHANGED);
    }

    setLoading(loading: boolean): void {
        if (this._loading === loading) {
            return;
        }
        this._loading = loading;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.LOADING_STATE_CHANGED);
    }

    setInitialized(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.INIT_STATE_CHANGED);
    }

    isInitialized(): boolean {
        return this._initialized || this._isStatic;
    }

    isLoading(): boolean {
        return this._loading;
    }

    valueToString(value: TValue, workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings): string {
        if (this._customSettingImplementation.valueToString) {
            return this._customSettingImplementation.valueToString({ value, workbenchSession, workbenchSettings });
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
        this._overridenValueProviderType = overriddenValueProviderType;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.OVERRIDDEN_VALUE_PROVIDER_CHANGED);
    }

    setOverriddenValue(overriddenValue: TValue | undefined): void {
        if (isEqual(this._overriddenValue, overriddenValue)) {
            return;
        }

        const prevValue = this._overriddenValue;
        this._overriddenValue = overriddenValue;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.OVERRIDDEN_VALUE_CHANGED);

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

        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TValue, TCategory>[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case SettingTopic.VALUE_CHANGED:
                    return this._value;
                case SettingTopic.VALIDITY_CHANGED:
                    return this._isValueValid;
                case SettingTopic.AVAILABLE_VALUES_CHANGED:
                    return this._availableValues;
                case SettingTopic.OVERRIDDEN_VALUE_CHANGED:
                    return this._overriddenValue;
                case SettingTopic.OVERRIDDEN_VALUE_PROVIDER_CHANGED:
                    return this._overridenValueProviderType;
                case SettingTopic.LOADING_STATE_CHANGED:
                    return this.isLoading();
                case SettingTopic.PERSISTED_STATE_CHANGED:
                    return this.isPersistedValue();
                case SettingTopic.INIT_STATE_CHANGED:
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

    getAvailableValues(): AvailableValuesType<TSetting> {
        return this._availableValues;
    }

    maybeResetPersistedValue(): boolean {
        if (this._currentValueFromPersistence === null) {
            return false;
        }

        const customCheck = this._customSettingImplementation.isValueValid;
        if (customCheck) {
            return !customCheck(this._availableValues, this._currentValueFromPersistence);
        }

        const categoryIsValueValidCheck = settingCategoryIsValueValidMap[this._category];
        return !categoryIsValueValidCheck(this._currentValueFromPersistence as any, this._availableValues as any);
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
        this.setValueValid(this.checkIfValueIsValid(this.getValue()));
        this.setInitialized();
        const prevIsValid = this._isValueValid;
        if (valueChanged || this._isValueValid !== prevIsValid) {
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CHANGED);
        }
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
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

        let candidate: TValue;
        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._availableValues, this._value);
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
        if (this._customSettingImplementation.isValueValid) {
            return this._customSettingImplementation.isValueValid(this._availableValues, value);
        } else {
            return settingCategoryIsValueValidMap[this._category](value as any, this._availableValues as any);
        }
    }
}
