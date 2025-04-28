import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
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
        return true;
    }

    isValueValid(value: ValueType): boolean {
        if (value === null) {
            return false;
        }

        if (!this._minMax) {
            return true;
        }

        return value >= this._minMax.min && value <= this._minMax.max;
    }

    fixupValue(currentValue: ValueType): ValueType {
        if (!this._minMax) {
            return currentValue;
        }

        if (currentValue === null) {
            return this._minMax.min;
        }

        return Math.min(Math.max(currentValue, this._minMax.min), this._minMax.max);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) => React.ReactNode {
        const minMax = this._minMax;

        return function InputNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) {
            const min = minMax?.min ?? 0;
            const max = minMax?.max ?? 0;

            function handleInputChange(value: string) {
                props.onValueChange(Number(value));
            }

            return (
                <Input
                    type="number"
                    value={!props.isOverridden ? (props.value ?? 0) : props.overriddenValue}
                    min={min}
                    max={max}
                    debounceTimeMs={200}
                    onValueChange={handleInputChange}
                />
            );
        };
    }
}
