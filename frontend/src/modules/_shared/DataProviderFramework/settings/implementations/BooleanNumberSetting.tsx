import type { ChangeEvent } from "react";
import type React from "react";

import { Input } from "@lib/components/Input";
import { Switch } from "@lib/components/Switch";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = {
    enabled: boolean;
    value: number;
} | null;

type StaticProps = { min?: number; max?: number };

export class BooleanNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.BOOLEAN_NUMBER> {
    private _staticProps: StaticProps | null;

    constructor(props: StaticProps) {
        if (
            props &&
            props.min != null &&
            props.max != null &&
            props.min > props.max
        ) {
            throw new Error("Min value cannot be greater than max value");
        }

        this._staticProps = props ?? null;
    }

    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.BOOLEAN_NUMBER>,
    ): boolean {
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

        if (availableValues === null) {
            // If no available values are provided, any valid tuple is acceptable
            return typeof value.enabled === "boolean" && typeof value.value === "number";
        }
        const [min, max] = availableValues;
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

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.BOOLEAN_NUMBER>,
    ): ValueType {
        if (currentValue === null) {
            // Default: boolean false, number at minimum value or 0
            let defaultNumber = 0;
            if (this._staticProps) {
                defaultNumber = this._staticProps.min ?? 0;
            } else if (availableValues) {
                defaultNumber = availableValues[0];
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

        if (availableValues === null) {
            // If no available values, return the current value as-is
            return currentValue;
        }

        const [min, max] = availableValues;

        // Clamp the number value to the available range
        const clampedNumber = Math.max(min, Math.min(max, currentValue.value));

        return {
            enabled: currentValue.enabled,
            value: clampedNumber,
        };
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.BOOLEAN_NUMBER>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function BooleanNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.BOOLEAN_NUMBER>) {
            const defaultMin = isStatic ? (staticProps?.min ?? 0) : (props.availableValues?.[0] ?? 0);

            const { enabled, value } = props.value ?? { enabled: false, value: defaultMin };
            const min = isStatic ? (staticProps?.min ?? 0) : (props.availableValues?.[0] ?? 0);
            const max = isStatic ? (staticProps?.max ?? 100) : (props.availableValues?.[1] ?? 100);

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
