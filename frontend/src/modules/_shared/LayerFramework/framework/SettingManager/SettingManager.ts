import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isArray, isEqual } from "lodash";
import { v4 } from "uuid";

import { AvailableValuesType, CustomSettingImplementation, SharedSettingsProvider } from "../../interfaces";
import { SettingCategories, SettingCategory, Setting, SettingTypes } from "../../settings/settingsTypes";
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

export type SettingTopicPayloads<TSetting extends Setting, TValue extends SettingTypes[TSetting]> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
    [SettingTopic.VALIDITY_CHANGED]: boolean;
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: AvailableValuesType<TSetting>;
    [SettingTopic.OVERRIDDEN_VALUE_CHANGED]: TValue | undefined;
    [SettingTopic.OVERRIDDEN_VALUE_PROVIDER_CHANGED]: OverriddenValueProviderType | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
    [SettingTopic.INIT_STATE_CHANGED]: boolean;
    [SettingTopic.PERSISTED_STATE_CHANGED]: boolean;
};

export type SettingManagerParams<TSetting extends Setting, TValue extends SettingTypes[TSetting] > = {
    type: Setting;
    category: SettingCategories[TSetting];
    label: string;
    defaultValue: TValue;
    customSettingImplementation: CustomSettingImplementation<TSetting, TValue>;
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
export class SettingManager<TSetting extends Setting, TValue extends SettingTypes[TSetting] = SettingTypes[TSetting], TCategory extends SettingCategory = SettingCategories[TSetting]>
    implements PublishSubscribe<SettingTopicPayloads<TSetting, TValue>>
{
    private _id: string;
    private _type: Setting;
    private _category: SettingCategories[Setting];
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<TSetting, TValue>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingTopicPayloads<TSetting, TValue>>();
    private _availableValues: AvailableValuesType<TSetting> = [] as unknown as AvailableValuesType<
        TSetting
    >;
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
    }: SettingManagerParams<TSetting, TValue>) {
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
            for (const sharedSetting of provider.getSharedSettingsDelegate().getWrappedSettings()) {
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

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TSetting, TValue>[T] {
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

        if (this._customSettingImplementation.isValueValid(this._availableValues, this._currentValueFromPersistence)) {
            this._value = this._currentValueFromPersistence;
            this._currentValueFromPersistence = null;
            return true;
        }
        return false;
    }

    setAvailableValues(availableValues: AvailableValuesType<TSetting>): void {
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

    private fixupOptionValue(availableValues: AvailableValuesType<TSetting>): boolean {
        if (availableValues.length === 0) {
            return false;
        }

        if (availableValues.some((el) => isEqual(el, this._value))) {
            return false;
        }

        let candidate = this._value;

        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._availableValues, this._value);
        } else if (Array.isArray(this._value)) {
            candidate = [availableValues[0]] as TValue;
        } else {
            candidate = availableValues[0] as TValue;
        }

        if (isEqual(candidate, this._value)) {
            return false;
        }

        this._value = candidate;
        return true;
    }

    private fixupRangeValue(availableValues: AvailableValuesType<TSetting>): boolean {
        if (!Array.isArray(availableValues) || availableValues.length < 2) {
            return false;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (max === null || min === null) {
            return false;
        }

        let candidate = this._value;

        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._availableValues, this._value);
        }

        if (candidate === null || candidate === undefined) {
            candidate = [min, max] as TValue;
            return true;
        }

        if (candidate < min) {
            candidate = [min, candidate[1]] as TValue;
            return true;
        }

        if (candidate > max) {
            candidate = max;
            return true;
        }

        if (isEqual(candidate, this._value)) {
            return false;
        }

        this._value = candidate;
        return true;
    }

    private maybeFixupNumberValue(availableValues: AvailableValuesType<TValue, SettingCategory.NUMBER>): boolean {
        let candidate = this._value;

        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._availableValues, this._value);
        }
        else {

        }

        if (candidate === null || candidate === undefined) {
            return false;
        }

        if (isEqual(candidate, this._value)) {
            return false;
        }

        this._value = candidate;
        return true;
    }


    private maybeFixupValue(): boolean {
        if (this.checkIfValueIsValid(this._value)) {
            return false;
        }

        if (this.isPersistedValue()) {
            return false;
        }

        if (this._category === SettingCategory.OPTION) {
            return this.fixupOptionValue(this._availableValues as AvailableValuesType<TValue, SettingCategory.OPTION>);
        }
        if (this._category === SettingCategory.RANGE) {
            return this.fixupRangeValue(this._availableValues as AvailableValuesType<TValue, SettingCategory.RANGE>);
        }
        if (this._)

    }

    private checkIfValueIsValid(value: TValue): boolean {
        if (this._customSettingImplementation.isValueValid) {
            return this._customSettingImplementation.isValueValid(this._availableValues, value);
        }
        if (typeof value === "boolean") {
            return true;
        }
        if (this._availableValues.length === 0) {
            return false;
        }
        if (this._availableValues.some((el) => isEqual(el, value))) {
            return true;
        }
        if (isArray(value) && value.every((value) => this._availableValues.some((el) => isEqual(value, el)))) {
            return true;
        }
        return false;
    }
}
