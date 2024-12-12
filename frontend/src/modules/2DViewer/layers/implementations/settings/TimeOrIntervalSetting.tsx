import React from "react";

import { SurfaceTimeType_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingType } from "./settingsTypes";

import { SettingRegistry } from "../../SettingRegistry";
import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps, ValueToStringArgs } from "../../interfaces";

type ValueType = string | null;

export class TimeOrIntervalSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType | null>(null, this);
    }

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

    valueToString(args: ValueToStringArgs<ValueType>): string {
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

SettingRegistry.registerSetting(TimeOrIntervalSetting);
