import React from "react";

import { Slider } from "@lib/components/Slider";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = [number, number] | null;

export class GridLayerIRangeSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getType(): SettingType {
        return SettingType.GRID_LAYER_I_RANGE;
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

        return value[0] >= min && value[0] <= max;
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
            return [min, max];
        }

        return [Math.max(currentValue[0], min), Math.min(currentValue[1], max)];
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function IRangeSlider(props: SettingComponentProps<ValueType>) {
            function handleChange(_: any, value: number | number[]) {
                if (!Array.isArray(value)) {
                    return;
                }

                props.onValueChange([value[0], value[1]]);
            }

            return (
                <Slider
                    min={0}
                    max={props.availableValues[0] ?? 1}
                    onChange={handleChange}
                    value={props.value ?? [0, props.availableValues[0] ?? 1]}
                    debounceTimeMs={500}
                    valueLabelDisplay="auto"
                />
            );
        };
    }
}

SettingRegistry.registerSetting(GridLayerIRangeSetting);
