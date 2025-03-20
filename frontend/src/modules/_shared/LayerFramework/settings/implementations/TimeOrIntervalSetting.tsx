import React from "react";

import { SurfaceTimeType_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

export class TimeOrIntervalSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Date";
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
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
        return "Initial / No date";
    }
    const [start, end] = input.split("/");
    if (end) {
        return isoIntervalStringToDateLabel(start, end);
    }
    return isoStringToDateLabel(start);
}
function isoStringToDateLabel(isoDatestring: string): string {
    const date = isoDatestring.split("T")[0];
    return `${date}`;
}

function isoIntervalStringToDateLabel(startIsoDateString: string, endIsoDateString: string): string {
    const startDate = startIsoDateString.split("T")[0];
    const endDate = endIsoDateString.split("T")[0];
    return `${startDate}/${endDate}`;
}
