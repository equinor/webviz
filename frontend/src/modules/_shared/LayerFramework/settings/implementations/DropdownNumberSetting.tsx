import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export class DropdownNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_SELECT> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function DropdownNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
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
