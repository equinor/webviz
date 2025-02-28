import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { AvailableValuesType, CustomSettingImplementation, SettingComponentProps } from "../../interfaces";

type ValueType = number | null;

export class GridLayerKSetting implements CustomSettingImplementation<ValueType> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Grid layer K";
    }

    isValueValid(availableValues: AvailableValuesType<ValueType>, value: ValueType): boolean {
        if (value === null) {
            return false;
        }

        if (availableValues.length < 3) {
            return false;
        }

        const min = 0;
        const max = availableValues[2];

        if (max === null) {
            return false;
        }

        return value >= min && value <= max;
    }

    fixupValue(availableValues: AvailableValuesType<ValueType>, currentValue: ValueType): ValueType {
        if (availableValues.length < 3) {
            return null;
        }

        const min = 0;
        const max = availableValues[2];

        if (max === null) {
            return null;
        }

        if (currentValue === null) {
            return min;
        }

        if (currentValue < min) {
            return min;
        }

        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
            const kRange = props.availableValues ? Array.from({ length: props.availableValues[2] }, (_, i) => i) : [];

            const options: DropdownOption[] = kRange.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(val: string) => props.onValueChange(parseInt(val))}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
