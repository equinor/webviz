import { isArray, isEqual } from "lodash";
import { v4 } from "uuid";

import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";

import { AvailableValuesType, Setting, SettingTopic, SettingTopicPayloads } from "../interfaces";

export class SettingDelegate<TValue> implements PublishSubscribe<SettingTopic, SettingTopicPayloads<TValue>> {
    private _id: string;
    private _owner: Setting<TValue>;
    private _value: TValue;
    private _isValueValid: boolean = false;
    private _publishSubscribeHandler = new PublishSubscribeDelegate<SettingTopic>();
    private _availableValues: AvailableValuesType<TValue> = [] as AvailableValuesType<TValue>;
    private _overriddenValue: TValue | undefined = undefined;
    private _loading: boolean = false;
    private _currentValueFromPersistence: TValue | null = null;

    constructor(value: TValue, owner: Setting<TValue>) {
        this._id = v4();
        this._owner = owner;
        this._value = value;
        if (typeof value === "boolean") {
            this._isValueValid = true;
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

        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    setIsValueValid(isValueValid: boolean): void {
        if (this._isValueValid === isValueValid) {
            return;
        }
        this._isValueValid = isValueValid;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALIDITY_CHANGED);
    }

    setLoadingState(loading: boolean): void {
        if (this._loading === loading) {
            return;
        }
        this._loading = loading;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.LOADING_STATE_CHANGED);
    }

    setOverriddenValue(overriddenValue: TValue | undefined): void {
        if (isEqual(this._overriddenValue, overriddenValue)) {
            return;
        }
        this._overriddenValue = overriddenValue;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.OVERRIDDEN_CHANGED);
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
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
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeDelegate<SettingTopic> {
        return this._publishSubscribeHandler;
    }

    getAvailableValues(): AvailableValuesType<TValue> {
        return this._availableValues;
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
        if (this._owner.isValueValid) {
            this.setIsValueValid(this._owner.isValueValid(this._availableValues, this._value));
            return;
        }
        if (typeof this._value === "boolean") {
            this.setIsValueValid(true);
            return;
        }
        if (this._availableValues.length === 0) {
            this.setIsValueValid(false);
            return;
        }
        if (this._availableValues.some((el) => isEqual(el, this._value))) {
            this.setIsValueValid(true);
            return;
        }
        if (
            isArray(this._value) &&
            this._value.every((value) => this._availableValues.some((el) => isEqual(value, el)))
        ) {
            this.setIsValueValid(true);
            return;
        }
        this.setIsValueValid(false);
    }

    private maybeResetPersistedValue(): boolean {
        if (this._currentValueFromPersistence === null) {
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
        if (isEqual(this._availableValues, availableValues)) {
            return;
        }

        this._availableValues = availableValues;
        let valueChanged = false;
        if (this.maybeFixupValue() || this.maybeResetPersistedValue()) {
            valueChanged = true;
        }
        this.checkIfValueIsValid();
        if (valueChanged) {
            this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
        }
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }
}
