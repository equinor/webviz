import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

export class DropdownStringSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
            const options: DropdownOption[] = props.availableValues.map((value) => {
                return {
                    value: value,
                    label: value === null ? "None" : value,
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
