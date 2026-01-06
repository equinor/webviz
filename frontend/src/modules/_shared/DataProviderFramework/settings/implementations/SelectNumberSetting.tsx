import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberArrayOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type ValueType = number[] | null;
type ValueConstraintsType = number[];

export class SelectNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isNumberArrayOrNull(value);
    }

    isValueValid(currentValue: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<number, number>(currentValue, valueConstraints, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<number, number>(currentValue, valueConstraints, (v) => v, "firstAvailable");
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function SelectNumberSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const options: SelectOption<number>[] = React.useMemo(() => {
                const availableValues = props.valueConstraints ?? [];
                return availableValues.map((value) => ({
                    value: value,
                    label: upperFirst(value.toString()),
                }));
            }, [props.valueConstraints]);

            function handleChange(value: number[]) {
                props.onValueChange(value);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={props.value ?? undefined}
                        onChange={handleChange}
                        showQuickSelectButtons={true}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}
