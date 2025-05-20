import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export class InputNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER> {
    private _staticMinMax: { min: number; max: number } | null;

    constructor(minMax?: { min: number; max: number }) {
        if (minMax && minMax.min > minMax.max) {
            throw new Error("Min value cannot be greater than max value ");
        }

        this._staticMinMax = minMax ?? null;
    }

    getIsStatic(): boolean {
        // If minMax is provided in constructor, the setting is defined as static
        return this._staticMinMax !== null;
    }

    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>,
    ): boolean {
        // If static limits are provided, Input component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticMinMax) {
            return true;
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
        // If static limits are provided, return value as Input component controls the value
        if (this._staticMinMax) {
            return currentValue;
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
        const minMax = this._staticMinMax;

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
