import type React from "react";

import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = { value: string; label: string }[] | null;

export class SelectStringSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    defaultValue: ValueType = null;

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function SelectSetting(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const availableValues = props.availableValues ?? [];

            function handleChange(selection: string[]) {
                const selectedOptions = availableValues.filter((val) => selection.includes(val.value));
                props.onValueChange(selectedOptions);
            }

            return (
                <Select
                    multiple
                    filter
                    value={props.value?.map((val) => val.value) ?? []}
                    onChange={handleChange}
                    options={availableValues}
                    debounceTimeMs={500}
                    showQuickSelectButtons
                    size={5}
                />
            );
        };
    }
}
