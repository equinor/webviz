import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = number | null;

export class GridLayerISetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getType(): SettingType {
        return SettingType.GRID_LAYER_I;
    }

    getLabel(): string {
        return "Grid layer I";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    isValueValid(availableValues: AvailableValuesType<ValueType>, value: ValueType): boolean {
        if (value === null) {
            return false;
        }

        if (availableValues.length < 3) {
            return false;
        }

        const min = 0;
        const max = availableValues[0];

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
        const max = availableValues[0];

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
            const iRange = props.availableValues ? Array.from({ length: props.availableValues[0] }, (_, i) => i) : [];

            const options: DropdownOption[] = iRange.map((value) => {
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

SettingRegistry.registerSetting(GridLayerISetting);
