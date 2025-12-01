import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type ValueType = number[] | null;
type ValueRangeType = number[];

export class SelectNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>();

    isValueValid(currentValue: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<number, number>(currentValue, valueRange, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<number, number>(currentValue, valueRange, (v) => v, "firstAvailable");
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function SelectNumberSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const options: SelectOption<number>[] = React.useMemo(() => {
                const availableValues = props.valueRange ?? [];
                return availableValues.map((value) => ({
                    value: value,
                    label: upperFirst(value.toString()),
                }));
            }, [props.valueRange]);

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
