import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberOrNull } from "../utils/structureValidation";

type ValueType = number | null;
type ValueConstraintsType = [number, number];

type StaticProps = { min?: number; max?: number };

export class InputNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _staticProps: StaticProps | null;
    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueConstraintsType, valueConstraints: ValueConstraintsType) => {
            if (accumulator === null) {
                return valueConstraints;
            }

            const min = Math.max(accumulator[0], valueConstraints[0]);
            const max = Math.min(accumulator[1], valueConstraints[1]);

            return [min, max] as ValueConstraintsType;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            return valueConstraints[0] <= valueConstraints[1];
        },
    };

    constructor(props: StaticProps) {
        if (props && !!props.min && !!props.max && props.min > props.max) {
            throw new Error("Min value cannot be greater than max value ");
        }

        this._staticProps = props ?? null;
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isNumberOrNull(value);
    }

    getIsStatic(): boolean {
        // If minMax is provided in constructor, the setting is defined as static
        return this._staticProps !== null;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        // If static limits are provided, Input component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticProps) {
            return true;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (value === null || value > max || value < min) {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        // If static limits are provided, return value as Input component controls the value
        if (this._staticProps) {
            return currentValue;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (currentValue === null || currentValue < min) {
            return min;
        }
        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function InputNumberSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const min = isStatic ? staticProps?.min : props.valueConstraints?.[0];
            const max = isStatic ? staticProps?.max : props.valueConstraints?.[1];

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
