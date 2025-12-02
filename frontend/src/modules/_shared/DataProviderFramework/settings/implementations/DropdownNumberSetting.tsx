import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = number | null;
type ValueRangeType = number[];

export class DropdownNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<number[]>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isNumberOrNull(value);
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<number, number>(value, valueRange, (v) => v);
    }

    fixupValue(value: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<number, number>(value, valueRange, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function DropdownNumberSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const availableValues = props.valueRange ?? [];

            const options: DropdownOption<number>[] = availableValues.map((value) => {
                return {
                    value: value,
                    label: value === null ? "None" : value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
