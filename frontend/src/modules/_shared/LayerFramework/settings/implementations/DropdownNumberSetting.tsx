import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export class DropdownNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        return function DropdownNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
            const availableValues = props.availableValues ?? [];

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
