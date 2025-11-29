import type { ChangeEvent } from "react";
import type React from "react";

import { Input } from "@lib/components/Input";
import { Switch } from "@lib/components/Switch";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { ValueRangeIntersectionReducerDefinition } from "../settingsDefinitions";

type ValueType = {
    enabled: boolean;
    value: number;
} | null;

type ValueRangeType = [number, number] | null;

type StaticProps = { min?: number; max?: number };

export class BooleanNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _staticProps: StaticProps | null;

    valueRangeIntersectionReducerDefinition: ValueRangeIntersectionReducerDefinition<ValueRangeType> = {
        reducer: (accumulator: ValueRangeType, currentAvailableValues: ValueRangeType): ValueRangeType => {
            if (accumulator === null) {
                return currentAvailableValues;
            }
            if (currentAvailableValues === null) {
                return accumulator;
            }

            const min = Math.max(accumulator[0], currentAvailableValues[0]);
            const max = Math.min(accumulator[1], currentAvailableValues[1]);

            if (min > max) {
                return null;
            }
            return [min, max];
        },
        startingValue: null,
        isValid: (availableValues: ValueRangeType): boolean => {
            if (availableValues === null) {
                return true;
            }
            return availableValues[0] <= availableValues[1];
        },
    };

    constructor(props: StaticProps) {
        if (props && props.min != null && props.max != null && props.min > props.max) {
            throw new Error("Min value cannot be greater than max value");
        }

        this._staticProps = props ?? null;
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        if (value === null) {
            return true;
        }

        // If static props are provided, use those for validation
        if (this._staticProps) {
            const min = this._staticProps.min ?? 0;
            const max = this._staticProps.max ?? 100;
            return (
                typeof value.enabled === "boolean" &&
                typeof value.value === "number" &&
                value.value >= min &&
                value.value <= max
            );
        }

        if (valueRange === null) {
            // If no available values are provided, any valid tuple is acceptable
            return typeof value.enabled === "boolean" && typeof value.value === "number";
        }
        const [min, max] = valueRange;
        return (
            typeof value.enabled === "boolean" &&
            typeof value.value === "number" &&
            value.value >= min &&
            value.value <= max
        );
    }

    getIsStatic(): boolean {
        return this._staticProps !== null;
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        if (currentValue === null) {
            // Default: boolean false, number at minimum value or 0
            let defaultNumber = 0;
            if (this._staticProps) {
                defaultNumber = this._staticProps.min ?? 0;
            } else if (valueRange) {
                defaultNumber = valueRange[0];
            }
            return {
                enabled: false,
                value: defaultNumber,
            };
        }

        // If static props are provided, use those for clamping
        if (this._staticProps) {
            const min = this._staticProps.min ?? 0;
            const max = this._staticProps.max ?? 100;
            const clampedNumber = Math.max(min, Math.min(max, currentValue.value));
            return {
                enabled: currentValue.enabled,
                value: clampedNumber,
            };
        }

        if (valueRange === null) {
            // If no available values, return the current value as-is
            return currentValue;
        }

        const [min, max] = valueRange;

        // Clamp the number value to the available range
        const clampedNumber = Math.max(min, Math.min(max, currentValue.value));

        return {
            enabled: currentValue.enabled,
            value: clampedNumber,
        };
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function BooleanNumberSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const defaultMin = isStatic ? (staticProps?.min ?? 0) : (props.valueRange?.[0] ?? 0);
            const { enabled, value } = props.value ?? { enabled: false, value: defaultMin };
            const min = isStatic ? (staticProps?.min ?? 0) : (props.valueRange?.[0] ?? 0);
            const max = isStatic ? (staticProps?.max ?? 100) : (props.valueRange?.[1] ?? 100);

            function handleBooleanChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange({ enabled: e.target.checked, value });
            }

            function handleNumberChange(value: string) {
                const numValue = Number(value);
                props.onValueChange({ enabled, value: numValue });
            }

            return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Switch checked={enabled} onChange={handleBooleanChange} />
                    <Input
                        type="number"
                        value={value}
                        min={min}
                        max={max}
                        disabled={!enabled}
                        debounceTimeMs={200}
                        onValueChange={handleNumberChange}
                    />
                </div>
            );
        };
    }
}
