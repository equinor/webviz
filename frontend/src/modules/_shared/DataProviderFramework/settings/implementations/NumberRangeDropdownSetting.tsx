import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberOrNull } from "../utils/structureValidation";

type ValueType = number | null;
type ValueRange = [number, number];

export class NumberRangeDropdownSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRange> {
    defaultValue: ValueType = null;
    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRange, valueConstraints: ValueRange) => {
            if (accumulator === null) {
                return valueConstraints;
            }

            const min = Math.max(accumulator[0], valueConstraints[0]);
            const max = Math.min(accumulator[1], valueConstraints[1]);

            return [min, max] as ValueRange;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueRange): boolean => {
            return valueConstraints[0] <= valueConstraints[1];
        },
    };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isNumberOrNull(value);
    }

    isValueValid(value: ValueType, valueConstraints: ValueRange): boolean {
        if (value === null) {
            return false;
        }

        if (!valueConstraints) {
            return false;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (max === null || min === null) {
            return false;
        }

        return value >= min && value <= max;
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueRange): ValueType {
        if (!valueConstraints) {
            return null;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (max === null || min === null) {
            return null;
        }

        if (currentValue === null) {
            return min;
        }

        if (currentValue < min) {
            return min;
        }

        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRange>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType, ValueRange>) {
            const start = props.valueConstraints?.[0] ?? 0;
            const end = props.valueConstraints?.[1] ?? 0;

            const rangeSize = end - start;

            const options: DropdownOption[] = Array.from({ length: rangeSize }, (_, index) => {
                const value = start + index;
                return {
                    value: value.toString(),
                    label: value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(val: string) => props.onValueChange(parseInt(val))}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
