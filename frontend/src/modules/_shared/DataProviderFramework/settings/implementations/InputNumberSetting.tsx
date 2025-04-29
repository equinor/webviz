import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export class InputNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER> {
    private _minMax: { min: number; max: number } | null;

    constructor(minMax?: { min: number; max: number }) {
        if (minMax && (minMax.min > minMax.max || minMax.min < 0)) {
            throw new Error("Min value cannot be greater than max value or less than 0");
        }

        this._minMax = minMax ?? null;
    }

    getIsStatic(): boolean {
        return this._minMax !== null;
    }

    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>,
    ): boolean {
        // If static, return the current value
        if (this.getIsStatic()) {
            return true;
        }

        if (availableValues.length < 2) {
            return value === null;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (value === null || value > max || value < min) {
            return false;
        }

        return true;
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>,
    ): ValueType {
        // If static, return the current value
        if (this.getIsStatic()) {
            return currentValue;
        }

        if (availableValues.length < 2) {
            return null;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (currentValue === null || currentValue < min) {
            return min;
        }
        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const minMax = this._minMax;

        return function InputNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) {
            const min = isStatic ? (minMax?.min ?? 0) : (props.availableValues?.[0] ?? 0);
            const max = isStatic ? (minMax?.max ?? 0) : (props.availableValues?.[1] ?? 0);

            function handleInputChange(value: string) {
                props.onValueChange(Number(value));
            }

            return (
                <Input
                    type="number"
                    value={!props.isOverridden ? (props.value ?? min) : props.overriddenValue}
                    min={min}
                    max={max}
                    debounceTimeMs={200}
                    onValueChange={handleInputChange}
                />
            );
        };
    }
}
