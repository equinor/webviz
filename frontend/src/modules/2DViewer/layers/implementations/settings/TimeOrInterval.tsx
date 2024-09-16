import React from "react";

import { SurfaceTimeType_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

type ValueType = string | null;

export class TimeOrInterval implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType> = new SettingDelegate<ValueType>(null);

    getType(): SettingType {
        return SettingType.TIME_OR_INTERVAL;
    }

    getLabel(): string {
        return "Date";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
            const options: DropdownOption[] = props.availableValues.map((value) => {
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
