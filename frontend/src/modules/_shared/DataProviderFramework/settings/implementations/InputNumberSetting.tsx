import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = number | null;
type ValueRangeType = [number, number];

type StaticProps = { min?: number; max?: number };

export class InputNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _staticProps: StaticProps | null;
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType) => {
            if (accumulator === null) {
                return valueRange;
            }

            const min = Math.max(accumulator[0], valueRange[0]);
            const max = Math.min(accumulator[1], valueRange[1]);

            return [min, max] as ValueRangeType;
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType): boolean => {
            return valueRange[0] <= valueRange[1];
        },
    };

    constructor(props: StaticProps) {
        if (props && !!props.min && !!props.max && props.min > props.max) {
            throw new Error("Min value cannot be greater than max value ");
        }

        this._staticProps = props ?? null;
    }

    getIsStatic(): boolean {
        // If minMax is provided in constructor, the setting is defined as static
        return this._staticProps !== null;
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        // If static limits are provided, Input component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticProps) {
            return true;
        }

        const min = valueRange[0];
        const max = valueRange[1];

        if (value === null || value > max || value < min) {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        // If static limits are provided, return value as Input component controls the value
        if (this._staticProps) {
            return currentValue;
        }

        const min = valueRange[0];
        const max = valueRange[1];

        if (currentValue === null || currentValue < min) {
            return min;
        }
        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function InputNumberSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const min = isStatic ? staticProps?.min : props.valueRange?.[0];
            const max = isStatic ? staticProps?.max : props.valueRange?.[1];

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
