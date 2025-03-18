import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import {
    CustomSettingImplementation,
    MakeAvailableValuesTypeBasedOnCategory,
    SettingComponentProps,
} from "../../interfaces";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export enum SeismicSliceDirection {
    INLINE,
    CROSSLINE,
    DEPTH,
}
export class SeismicSliceSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    private _direction: SeismicSliceDirection;

    constructor(direction: SeismicSliceDirection) {
        this._direction = direction;
    }

    isValueValid(
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.SINGLE_OPTION>,
        value: ValueType
    ): boolean {
        if (value === null) {
            return false;
        }

        if (availableValues.length < 2) {
            return false;
        }

        const min = 0;
        const max = availableValues[1];

        if (max === null) {
            return false;
        }

        return value >= min && value <= max;
    }

    fixupValue(
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.SINGLE_OPTION>,
        currentValue: ValueType
    ): ValueType {
        if (availableValues.length < 2) {
            return null;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (max === null) {
            return null;
        }

        if (currentValue === null) {
            return min;
        }

        return Math.min(Math.max(currentValue, min), max);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        const direction = this._direction;
        return function RangeSlider(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
            function handleSliderChange(_: any, value: number | number[]) {
                if (Array.isArray(value)) {
                    return value[0];
                }

                props.onValueChange(value);
            }

            function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
                let value = Number(event.target.value);

                if (direction === SeismicSliceDirection.DEPTH) {
                    // Check if value is allowed (in increments of availableValues[2], if not return closest allowed value)
                    const min = props.availableValues[0];
                    const max = props.availableValues[1];
                    const step = props.availableValues[2];
                    const allowedValues = Array.from(
                        { length: Math.floor((max - min) / step) + 1 },
                        (_, i) => min + i * step
                    );
                    value = allowedValues.reduce((prev, curr) =>
                        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
                    );
                }

                props.onValueChange(value);
            }

            return (
                <div className="flex items-center space-x-1">
                    <div className="flex-grow">
                        <Slider
                            min={0}
                            max={props.availableValues[1] ?? 1}
                            onChange={handleSliderChange}
                            value={props.value ?? props.availableValues[0] ?? 1}
                            debounceTimeMs={500}
                            valueLabelDisplay="auto"
                        />
                    </div>
                    <div className="w-1/5">
                        <Input type="number" value={props.value} onChange={handleInputChange} />
                    </div>
                </div>
            );
        };
    }
}
