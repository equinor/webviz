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
        return this._value;
    }

    isValueValid(): boolean {
        this.checkIfValueIsValid();
        return this._isValueValid;
    }

    setValue(value: TValue): void {
        if (isEqual(this._value, value)) {
            return;
        }
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

    private maybeFixupValue(value: TValue): TValue {
        if (typeof value === "boolean") {
            return value;
        }
        if (this._availableValues.length === 0) {
            return value;
        }
        if (this._availableValues.includes(value)) {
            return value;
        }

        if (this._owner.fixupValue) {
            return this._owner.fixupValue(this._availableValues, value);
        }

        if (Array.isArray(value)) {
            return [this._availableValues[0]] as TValue;
        }
        return this._availableValues[0] as TValue;
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

    setAvailableValues(availableValues: AvailableValuesType<TValue>): void {
        this._availableValues = availableValues;
        this.setValue(this.maybeFixupValue(this._value));
        this.checkIfValueIsValid();
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }
}
