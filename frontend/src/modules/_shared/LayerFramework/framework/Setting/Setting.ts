import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { isArray, isEqual } from "lodash";
import { v4 } from "uuid";

import { AvailableValuesType, CustomSettingImplementation } from "../../interfaces";
import { SettingType } from "../../settings/settingsTypes";

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
    VALIDITY_CHANGED = "VALIDITY_CHANGED",
    AVAILABLE_VALUES_CHANGED = "AVAILABLE_VALUES_CHANGED",
    OVERRIDDEN_CHANGED = "OVERRIDDEN_CHANGED",
    LOADING_STATE_CHANGED = "LOADING_STATE_CHANGED",
    INIT_STATE_CHANGED = "INIT_STATE_CHANGED",
    PERSISTED_STATE_CHANGED = "PERSISTED_STATE_CHANGED",
}

export type SettingTopicPayloads<TValue> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
    [SettingTopic.VALIDITY_CHANGED]: boolean;
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: AvailableValuesType<TValue>;
    [SettingTopic.OVERRIDDEN_CHANGED]: TValue | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
    [SettingTopic.INIT_STATE_CHANGED]: boolean;
    [SettingTopic.PERSISTED_STATE_CHANGED]: boolean;
};

export type SettingParams<TValue> = {
    type: SettingType;
    label: string;
    defaultValue: TValue;
    customSettingImplementation: CustomSettingImplementation<TValue>;
};

/*
 * The Setting class is responsible for managing a setting.
 *
 * It provides a method for setting available values, which are used to validate the setting value or applying a fixup if the value is invalid.
 * It provides methods for setting and getting the value and its states, checking if the value is valid, and setting the value as overridden or persisted.
 */
export class Setting<TValue> implements PublishSubscribe<SettingTopicPayloads<TValue>> {
    private _id: string;
    private _type: SettingType;
    private _label: string;
    private _customSettingImplementation: CustomSettingImplementation<TValue>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingTopicPayloads<TValue>>();
    private _availableValues: AvailableValuesType<TValue> = [] as unknown as AvailableValuesType<TValue>;
    private _overriddenValue: TValue | undefined = undefined;
    private _loading: boolean = false;
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TValue | null = null;
    private _isStatic: boolean;

    constructor({ type, customSettingImplementation, defaultValue, label }: SettingParams<TValue>) {
        this._id = v4();
        this._type = type;
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

    getType(): SettingType {
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
        return this._initialized;
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

    setOverriddenValue(overriddenValue: TValue | undefined): void {
        if (isEqual(this._overriddenValue, overriddenValue)) {
            return;
        }

        const prevValue = this._overriddenValue;
        this._overriddenValue = overriddenValue;
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.OVERRIDDEN_CHANGED);

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

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TValue>[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingTopic.VALUE_CHANGED) {
                return this._value;
            }
            if (topic === SettingTopic.VALIDITY_CHANGED) {
                return this._isValueValid;
            }
            if (topic === SettingTopic.AVAILABLE_VALUES_CHANGED) {
                return this._availableValues;
            }
            if (topic === SettingTopic.OVERRIDDEN_CHANGED) {
                return this._overriddenValue;
            }
            if (topic === SettingTopic.LOADING_STATE_CHANGED) {
                return this._loading;
            }
            if (topic === SettingTopic.PERSISTED_STATE_CHANGED) {
                return this.isPersistedValue();
            }
            if (topic === SettingTopic.INIT_STATE_CHANGED) {
                return this._initialized;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SettingTopicPayloads<TValue>> {
        return this._publishSubscribeDelegate;
    }

    getAvailableValues(): AvailableValuesType<TValue> {
        return this._availableValues;
    }

    maybeResetPersistedValue(): boolean {
        if (this._currentValueFromPersistence === null) {
            return false;
        }

        if (this._customSettingImplementation.isValueValid) {
            if (
                this._customSettingImplementation.isValueValid(this._availableValues, this._currentValueFromPersistence)
            ) {
                this._value = this._currentValueFromPersistence;
                this._currentValueFromPersistence = null;
                return true;
            }
            return false;
        }

        if (Array.isArray(this._currentValueFromPersistence)) {
            const currentValueFromPersistence = this._currentValueFromPersistence as TValue[];
            if (currentValueFromPersistence.every((value) => this._availableValues.some((el) => isEqual(el, value)))) {
                this._value = this._currentValueFromPersistence;
                this._currentValueFromPersistence = null;
                return true;
            }
            return false;
        }

        if (this._availableValues.some((el) => isEqual(this._currentValueFromPersistence as TValue, el))) {
            this._value = this._currentValueFromPersistence;
            this._currentValueFromPersistence = null;
            return true;
        }

        return false;
    }

    setAvailableValues(availableValues: AvailableValuesType<TValue>): void {
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

        if (this._availableValues.length === 0) {
            return false;
        }

        if (this._availableValues.some((el) => isEqual(el, this._value))) {
            return false;
        }

        let candidate = this._value;

        if (this._customSettingImplementation.fixupValue) {
            candidate = this._customSettingImplementation.fixupValue(this._availableValues, this._value);
        } else if (Array.isArray(this._value)) {
            candidate = [this._availableValues[0]] as TValue;
        } else {
            candidate = this._availableValues[0] as TValue;
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
