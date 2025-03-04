import type React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import type { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = number | null;

export class SeismicDepthSliceSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getType(): SettingType {
        return SettingType.SEISMIC_DEPTH_SLICE;
    }

    getLabel(): string {
        return "Seismic depth";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    isValueValid(availableValues: AvailableValuesType<ValueType>, value: ValueType): boolean {
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

    fixupValue(availableValues: AvailableValuesType<ValueType>, currentValue: ValueType): ValueType {
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

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType>) {
            function handleSliderChange(_: any, value: number | number[]) {
                if (Array.isArray(value)) {
                    return value[0];
                }

                props.onValueChange(value);
            }
            function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
                // Check if value is allowed (in increments of availableValues[2], if not return closest allowed value)
                const value = Number(event.target.value);
                const min = props.availableValues[0];
                const max = props.availableValues[1];
                const step = props.availableValues[2];
                const allowedValues = Array.from(
                    { length: Math.floor((max - min) / step) + 1 },
                    (_, i) => min + i * step,
                );
                const closestValue = allowedValues.reduce((prev, curr) =>
                    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
                );
                props.onValueChange(closestValue);
            }

            return (
                <div className="flex items-center space-x-1">
                    <div className="flex-grow">
                        <Slider
                            min={props.availableValues[0]}
                            max={props.availableValues[1]}
                            onChange={handleSliderChange}
                            value={props.value ?? props.availableValues[0] ?? 1}
                            debounceTimeMs={500}
                            valueLabelDisplay="auto"
                            step={props.availableValues[2]}
                        />
                    </div>
                    <div className="w-1/5">
                        <Input value={props.value} onChange={handleInputChange} />
                    </div>
                </div>
            );
        };
    }
}

SettingRegistry.registerSetting(SeismicDepthSliceSetting);
