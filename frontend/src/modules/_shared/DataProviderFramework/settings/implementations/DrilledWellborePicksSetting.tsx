import React from "react";

import type { WellborePick_api } from "@api";
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
        if (!currentValue) {
            return availableValues.length !== 0;
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

            // Prevent duplicated pickIdentifiers in the options
            const uniquePickIdentifiers = Array.from(new Set(availableValues.map((ident) => ident.pickIdentifier)));
            const options: SelectOption[] = uniquePickIdentifiers.map((pickIdentifier) => ({
                value: pickIdentifier,
                label: pickIdentifier,
            }));

            function handleChange(selectedIdentifiers: string[]) {
                // Match all WellborePicks with selected pickIdentifiers
                const selectedWellbores = availableValues.filter((elm) =>
                    selectedIdentifiers.includes(elm.pickIdentifier),
                );
                props.onValueChange(selectedWellbores);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((ident) => ident.pickIdentifier) ?? [],
                [props.value],
            );

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={selectedValues}
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
