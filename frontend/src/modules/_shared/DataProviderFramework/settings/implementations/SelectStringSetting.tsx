import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string[] | null;

export class SelectStringSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function SelectStringSetting(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const options: SelectOption[] = React.useMemo(() => {
                const availableValues = props.availableValues ?? [];
                return availableValues.map((stringVals) => ({
                    value: stringVals,
                    label: upperFirst(stringVals),
                }));
            }, [props.availableValues]);

            function handleChange(selectedUuids: string[]) {
                props.onValueChange(selectedUuids);
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
