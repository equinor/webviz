import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import { SettingCategory } from "../settingsDefinitions";

export enum Direction {
    I,
    J,
    K,
}

type ValueType = number | null;

export class GridLayerSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER> {
    defaultValue: ValueType = null;

    private _direction: Direction;

    constructor(direction: Direction) {
        this._direction = direction;
    }

    getLabel(): string {
        switch (this._direction) {
            case Direction.I:
                return "Grid layer I";
            case Direction.J:
                return "Grid layer J";
            case Direction.K:
                return "Grid layer K";
        }
    }

    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>
    ): boolean {
        if (value === null) {
            return false;
        }

        if (!availableValues) {
            return false;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (max === null || min === null) {
            return false;
        }

        return value >= min && value <= max;
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>
    ): ValueType {
        if (!availableValues) {
            return null;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (max === null || min === null) {
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

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType, SettingCategory.NUMBER>) {
            const kRange = [props.availableValues?.[0] ?? 0, props.availableValues?.[1] ?? 0];

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
