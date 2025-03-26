import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

export class DropdownStringSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_SELECT> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function DropdownStringSetting(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
            const availableValues = props.availableValues ?? [];

            const options: DropdownOption[] = availableValues.map((value) => {
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
