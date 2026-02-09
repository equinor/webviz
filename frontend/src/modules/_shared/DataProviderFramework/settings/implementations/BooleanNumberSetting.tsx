import type { ChangeEvent } from "react";
import type React from "react";

import { Input } from "@lib/components/Input";
import { Switch } from "@lib/components/Switch";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = {
    enabled: boolean;
    value: number;
} | null;

type ValueConstraintsType = [number, number] | null;

type StaticProps = { min?: number; max?: number };

export class BooleanNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _staticProps: StaticProps | null;

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueConstraintsType, valueConstraints: ValueConstraintsType) => {
            if (accumulator === null) {
                return valueConstraints;
            }
            if (valueConstraints === null) {
                return accumulator;
            }

            const min = Math.max(accumulator[0], valueConstraints[0]);
            const max = Math.min(accumulator[1], valueConstraints[1]);

            if (min > max) {
                return null;
            }
            return [min, max] as ValueConstraintsType;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            if (valueConstraints === null) {
                return true;
            }
            return valueConstraints[0] <= valueConstraints[1];
        },
    };

    constructor(props: StaticProps) {
        if (props && props.min != null && props.max != null && props.min > props.max) {
            throw new Error("Min value cannot be greater than max value");
        }

        this._staticProps = props ?? null;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;
        if (typeof v.enabled !== "boolean" || typeof v.value !== "number") {
            throw new Error("Expected object with boolean 'enabled' and number 'value'");
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
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

        if (valueConstraints === null) {
            // If no available values are provided, any valid tuple is acceptable
            return typeof value.enabled === "boolean" && typeof value.value === "number";
        }
        const [min, max] = valueConstraints;
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

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        if (currentValue === null) {
            // Default: boolean false, number at minimum value or 0
            let defaultNumber = 0;
            if (this._staticProps) {
                defaultNumber = this._staticProps.min ?? 0;
            } else if (valueConstraints) {
                defaultNumber = valueConstraints[0];
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

        if (valueConstraints === null) {
            // If no available values, return the current value as-is
            return currentValue;
        }

        const [min, max] = valueConstraints;

        // Clamp the number value to the available range
        const clampedNumber = Math.max(min, Math.min(max, currentValue.value));

        return {
            enabled: currentValue.enabled,
            value: clampedNumber,
        };
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function BooleanNumberSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const defaultMin = isStatic ? (staticProps?.min ?? 0) : (props.valueConstraints?.[0] ?? 0);
            const { enabled, value } = props.value ?? { enabled: false, value: defaultMin };
            const min = isStatic ? (staticProps?.min ?? 0) : (props.valueConstraints?.[0] ?? 0);
            const max = isStatic ? (staticProps?.max ?? 100) : (props.valueConstraints?.[1] ?? 100);

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
