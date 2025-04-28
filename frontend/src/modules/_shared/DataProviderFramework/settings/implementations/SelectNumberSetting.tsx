import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

import { upperFirst } from "lodash";

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
