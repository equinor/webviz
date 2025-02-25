import React from "react";

import { Slider } from "@lib/components/Slider";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = [number, number] | null;

export enum Direction {
    I,
    J,
    K,
}

export class GridLayerRangeSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;
    private _direction: Direction;
    private _params: [Direction];

    constructor(...params: [Direction]) {
        this._delegate = new SettingDelegate<ValueType>(null, this);
        this._params = params;
        this._direction = params[0];
    }

    getConstructorParams() {
        return this._params;
    }

    getType(): SettingType {
        switch (this._direction) {
            case Direction.I:
                return SettingType.GRID_LAYER_I_RANGE;
            case Direction.J:
                return SettingType.GRID_LAYER_J_RANGE;
            case Direction.K:
                return SettingType.GRID_LAYER_K_RANGE;
        }
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
        const max = availableValues[this._direction];

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
        const max = availableValues[this._direction];

        if (max === null) {
            return null;
        }

        if (currentValue === null) {
            return [min, max];
        }

        return [Math.max(currentValue[0], min), Math.min(currentValue[1], max)];
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        const direction = this._direction;
        return function RangeSlider(props: SettingComponentProps<ValueType>) {
            function handleChange(_: any, value: number | number[]) {
                if (!Array.isArray(value)) {
                    return;
                }

                props.onValueChange([value[0], value[1]]);
            }

            return (
                <Slider
                    min={0}
                    max={props.availableValues[direction] ?? 1}
                    onChange={handleChange}
                    value={props.value ?? [0, props.availableValues[direction] ?? 1]}
                    debounceTimeMs={500}
                    valueLabelDisplay="auto"
                />
            );
        };
    }
}

SettingRegistry.registerSetting(GridLayerRangeSetting);
