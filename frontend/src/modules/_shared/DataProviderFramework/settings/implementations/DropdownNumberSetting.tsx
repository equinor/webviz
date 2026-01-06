import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = number | null;
type ValueConstraintsType = number[];

export class DropdownNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<number[]>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isNumberOrNull(value);
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<number, number>(value, valueConstraints, (v) => v);
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<number, number>(value, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function DropdownNumberSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];

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
