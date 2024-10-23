import { isEqual } from "lodash";
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

        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    setIsValueValid(isValueValid: boolean): void {
        this._isValueValid = isValueValid;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALIDITY_CHANGED);
    }

    setLoadingState(loading: boolean): void {
        this._loading = loading;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.LOADING_STATE_CHANGED);
    }

    setOverriddenValue(overriddenValue: TValue | undefined): void {
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
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeDelegate<SettingTopic> {
        return this._publishSubscribeHandler;
    }

    getAvailableValues(): AvailableValuesType<TValue> {
        return this._availableValues;
    }

    private maybeFixupValue(): void {
        if (this.isPersistedValue()) {
            return;
        }
        if (typeof this._value === "boolean") {
            this.setIsValueValid(true);
        }
        if (this._availableValues.length === 0) {
            this.setIsValueValid(false);
        }
        if (this._availableValues.includes(this._value)) {
            this.setIsValueValid(true);
        }
        this.setIsValueValid(true);

        if (this._owner.fixupValue) {
            this._value = this._owner.fixupValue(this._availableValues, this._value);
            return;
        }

        if (Array.isArray(this._value)) {
            this._value = [this._availableValues[0]] as TValue;
        }
        this._value = this._availableValues[0] as TValue;
    }

    private maybeResetPersistedValue(): void {
        if (this._currentValueFromPersistence === null) {
            return;
        }

        if (Array.isArray(this._currentValueFromPersistence)) {
            const currentValueFromPersistence = this._currentValueFromPersistence as TValue[];
            if (this._availableValues.every((value) => currentValueFromPersistence.includes(value as TValue))) {
                this._value = this._currentValueFromPersistence;
                this._currentValueFromPersistence = null;
            }
            return;
        }

        if (this._availableValues.includes(this._currentValueFromPersistence as TValue)) {
            this._value = this._currentValueFromPersistence as TValue;
            this._currentValueFromPersistence = null;
        }
    }

    setAvailableValues(availableValues: AvailableValuesType<TValue>): void {
        this._availableValues = availableValues;
        this.maybeFixupValue();
        this.maybeResetPersistedValue();
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }
}
