import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { isArray, isEqual } from "lodash";
import { v4 } from "uuid";

import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";

import { AvailableValuesType, Setting } from "../interfaces";

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
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: Exclude<TValue, null>[];
    [SettingTopic.OVERRIDDEN_CHANGED]: TValue | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
    [SettingTopic.INIT_STATE_CHANGED]: boolean;
    [SettingTopic.PERSISTED_STATE_CHANGED]: boolean;
};

export class SettingDelegate<TValue> implements PublishSubscribe<SettingTopic, SettingTopicPayloads<TValue>> {
    private _id: string;
    private _owner: Setting<TValue>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SettingTopic>();
    private _availableValues: AvailableValuesType<TValue> = [] as unknown as AvailableValuesType<TValue>;
    private _overriddenValue: TValue | undefined = undefined;
    private _loading: boolean = false;
    private _initialized: boolean = false;
    private _currentValueFromPersistence: TValue | null = null;
    private _isStatic: boolean;

    constructor(value: TValue, owner: Setting<TValue>, isStatic: boolean = false) {
        this._id = v4();
        this._owner = owner;
        this._value = value;
        if (typeof value === "boolean") {
            this._isValueValid = true;
        }
        this._isStatic = isStatic;
        if (isStatic) {
            this.setInitialized();
        }
    }

    getId(): string {
        return this._id;
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
        if (this._owner.serializeValue) {
            return this._owner.serializeValue(this.getValue());
        }

        return JSON.stringify(this.getValue());
    }

    deserializeValue(serializedValue: string): void {
        if (this._owner.deserializeValue) {
            this._currentValueFromPersistence = this._owner.deserializeValue(serializedValue);
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

        this.checkIfValueIsValid();

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
        if (this._owner.valueToString) {
            return this._owner.valueToString({ value, workbenchSession, workbenchSettings });
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

        if (this._overriddenValue === undefined) {
            this.maybeFixupValue();
        }

        this.checkIfValueIsValid();

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

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SettingTopic> {
        return this._publishSubscribeDelegate;
    }

    getAvailableValues(): AvailableValuesType<TValue> {
        return this._availableValues;
    }

    maybeResetPersistedValue(): boolean {
        if (this._currentValueFromPersistence === null) {
            return false;
        }

        if (this._owner.isValueValid) {
            if (this._owner.isValueValid(this._availableValues, this._currentValueFromPersistence)) {
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

        this.setInitialized();

        this._availableValues = availableValues;
        this.checkIfValueIsValid();
        let valueChanged = false;
        if ((!this._isValueValid && this.maybeFixupValue()) || this.maybeResetPersistedValue()) {
            valueChanged = true;
            this.checkIfValueIsValid();
        }
        const prevIsValid = this._isValueValid;
        if (valueChanged || this._isValueValid !== prevIsValid) {
            this.setInitialized();
            this._publishSubscribeDelegate.notifySubscribers(SettingTopic.VALUE_CHANGED);
        }
        this._publishSubscribeDelegate.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }

    private maybeFixupValue(): boolean {
        if (this.isPersistedValue()) {
            return false;
        }

        if (this._availableValues.length === 0) {
            return false;
        }

        let candidate = this._value;

        if (this._owner.fixupValue) {
            candidate = this._owner.fixupValue(this._availableValues, this._value);
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

    private checkIfValueIsValid(): void {
        const value = this.getValue();

        if (this._owner.isValueValid) {
            this.setValueValid(this._owner.isValueValid(this._availableValues, value));
            return;
        }
        if (typeof value === "boolean") {
            this.setValueValid(true);
            return;
        }
        if (this._availableValues.length === 0) {
            this.setValueValid(false);
            return;
        }
        if (this._availableValues.some((el) => isEqual(el, value))) {
            this.setValueValid(true);
            return;
        }
        if (isArray(value) && value.every((value) => this._availableValues.some((el) => isEqual(value, el)))) {
            this.setValueValid(true);
            return;
        }
        this.setValueValid(false);
    }
}
