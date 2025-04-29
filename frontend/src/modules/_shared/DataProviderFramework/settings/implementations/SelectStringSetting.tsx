import React from "react";

import { Deselect, SelectAll } from "@mui/icons-material";
import { upperFirst } from "lodash";

import { DenseIconButton } from "@lib/components/DenseIconButton";
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

            function selectAll() {
                handleChange(props.availableValues ?? []);
            }

            function selectNone() {
                handleChange([]);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2">
                        <DenseIconButton onClick={selectAll} title="Select all">
                            <SelectAll fontSize="inherit" />
                            Select all
                        </DenseIconButton>
                        <DenseIconButton onClick={selectNone} title="Clear selection">
                            <Deselect fontSize="inherit" />
                            Clear selection
                        </DenseIconButton>
                    </div>
                    <Select
                        filter
                        options={options}
                        value={props.value ?? undefined}
                        onChange={handleChange}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}
