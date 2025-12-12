import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isStringArrayOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type ValueType = string[] | null;
type ValueRangeType = string[];

export class SelectStringSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isStringArrayOrNull(value);
    }

    isValueValid(currentValue: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<string, string>(currentValue, valueRange, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<string, string>(currentValue, valueRange, (v) => v, "firstAvailable");
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function SelectStringSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const options: SelectOption[] = React.useMemo(() => {
                const availableValues = props.valueRange ?? [];
                return availableValues.map((stringVals) => ({
                    value: stringVals,
                    label: upperFirst(stringVals),
                }));
            }, [props.valueRange]);

            function handleChange(selectedUuids: string[]) {
                props.onValueChange(selectedUuids);
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
