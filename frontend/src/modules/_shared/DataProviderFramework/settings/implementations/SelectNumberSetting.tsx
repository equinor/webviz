import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number[] | null;

export class SelectNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function SelectNumberSetting(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const options: SelectOption<number>[] = React.useMemo(() => {
                const availableValues = props.availableValues ?? [];
                return availableValues.map((value) => ({
                    value: value,
                    label: upperFirst(value.toString()),
                }));
            }, [props.availableValues]);

            function handleChange(value: number[]) {
                props.onValueChange(value);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={props.value ?? undefined}
                        onChange={handleChange}
                        showQuickSelectButtons={true}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}
