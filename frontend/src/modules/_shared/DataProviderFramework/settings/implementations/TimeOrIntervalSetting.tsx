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
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

export class TimeOrIntervalSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_SELECT> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Date";
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function TimeOrIntervalSetting(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
            const availableValues = props.availableValues ?? [];

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
