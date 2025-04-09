import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

const STABLE_EMPTY_ARR = [] as const;
type ValueType<T> = T[] | null;

/**
 * ! Currently unsure if this one is keepable. Might be too complicated compared to what's offered
 */
export class ObjectSelectionSetting<T extends Record<string, any>>
    implements CustomSettingImplementation<ValueType<T>, SettingCategory.MULTI_SELECT>
{
    private _optValKey: keyof T;
    private _optLabelKey: keyof T;

    constructor(optValKey: keyof T, optLabelKey?: keyof T) {
        this._optValKey = optValKey;
        this._optLabelKey = optLabelKey ?? optValKey;
    }

    private transformValueToOption(object: T): SelectOption {
        return {
            value: this.getOptionValue(object),
            label: this.getOptionLabel(object),
        };
    }

    private getOptionValue(object: T): string {
        const value = object[this._optValKey];

        if (typeof value !== "string") throw new Error(`Expected object value to be a string, but got ${typeof value}`);

        return value;
    }

    private getOptionLabel(object: T): string {
        const value = object[this._optLabelKey];

        if (typeof value !== "string") throw new Error(`Expected object value to be a string, but got ${typeof value}`);

        return value;
    }

    fixupValue(
        currentValue: ValueType<T>,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType<T>, SettingCategory.MULTI_SELECT>,
    ): ValueType<T> {
        if (!currentValue) {
            return availableValues;
        }

        const matchingValues = currentValue.filter((value) =>
            availableValues.some(
                (availableValue) => this.getOptionValue(availableValue) === this.getOptionValue(value),
            ),
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType<T>, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        // ! Bind class methods to ensure stable refs
        const transformObjectToOption = this.transformValueToOption.bind(this);
        const getObjectValue = this.getOptionValue.bind(this);

        return function DrilledWellbores(props: SettingComponentProps<ValueType<T>, SettingCategory.MULTI_SELECT>) {
            const availableValues = props.availableValues ?? STABLE_EMPTY_ARR;

            const options: SelectOption[] = React.useMemo(
                () => availableValues.map(transformObjectToOption),
                [availableValues],
            );

            function handleChange(selectedIdents: string[]) {
                const selectedObjects = availableValues.filter((obj) => selectedIdents.includes(getObjectValue(obj)));
                props.onValueChange(selectedObjects);
            }

            function selectAll() {
                const allIdents = availableValues.map((obj) => getObjectValue(obj));
                handleChange(allIdents);
            }

            function selectNone() {
                handleChange([]);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((obj) => getObjectValue(obj)) ?? [],
                [props.value],
            );

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
                        value={selectedValues}
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
