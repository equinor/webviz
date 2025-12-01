import type React from "react";

import { SurfaceTimeType_api } from "@api";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import {
    isIsoIntervalString,
    isIsoString,
    isoIntervalStringToDateLabel,
    isoStringToDateLabel,
} from "@modules/_shared/utils/isoDatetimeStringFormatting";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = string | null;
type ValueRangeType = string[];

export class TimeOrIntervalSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    defaultValue: ValueType = null;

    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>();

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<string, string>(value, valueRange, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<string, string>(currentValue, valueRange, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function TimeOrIntervalSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const availableValues = props.valueRange ?? [];

            const options: DropdownOption[] = availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: timeTypeToLabel(value),
                };
            });

            return (
                <Dropdown
                    options={options}
                    placeholder="Select a date"
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        const { value } = args;
        if (value === null) {
            return "-";
        }
        return timeTypeToLabel(value);
    }
}

function timeTypeToLabel(input: string): string {
    if (input === SurfaceTimeType_api.NO_TIME) {
        return "No date";
    }
    if (isIsoIntervalString(input)) {
        return isoIntervalStringToDateLabel(input);
    }
    if (isIsoString(input)) {
        return isoStringToDateLabel(input);
    }
    // Fallback to the original input if it doesn't match any known format
    return input;
}
