import React from "react";

import { Deselect, SelectAll } from "@mui/icons-material";

import type { WellborePick_api } from "@api";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = WellborePick_api[] | null;

export class DrilledWellborePicksSetting
    implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT>
{
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Drilled wellbore picks";
    }

    isValueValid(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.MULTI_SELECT>,
    ): boolean {
        if (!currentValue && availableValues.length === 0) {
            return false;
        }

        if (!currentValue) {
            return true;
        }

        // Check if every element in currentValue is in availableValues
        const isValid = currentValue.every((value) =>
            availableValues.some(
                (availableValue) =>
                    availableValue.pickIdentifier === value.pickIdentifier &&
                    availableValue.interpreter === value.interpreter,
            ),
        );

        return isValid;
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.MULTI_SELECT>,
    ): ValueType {
        if (!currentValue) {
            return availableValues;
        }

        // Filter new/available values with old/previously selected pickIdentifiers
        const matchingNewValues = availableValues.filter((newValue) =>
            currentValue.some((oldValue) => oldValue.pickIdentifier === newValue.pickIdentifier),
        );

        if (matchingNewValues.length === 0) {
            return availableValues;
        }
        return matchingNewValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function DrilledWellborePicks(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const availableValues = props.availableValues ?? [];

            const options: SelectOption[] = availableValues?.map((ident) => ({
                value: ident.pickIdentifier,
                label: ident.pickIdentifier,
            }));

            function handleChange(selectedIdentifiers: string[]) {
                const selectedWellbores = availableValues.filter((elm) =>
                    selectedIdentifiers.includes(elm.pickIdentifier),
                );
                props.onValueChange(selectedWellbores);
            }

            function selectAll() {
                const allUuids = availableValues.map((ident) => ident.pickIdentifier);
                handleChange(allUuids);
            }

            function selectNone() {
                handleChange([]);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((ident) => ident.pickIdentifier) ?? [],
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
