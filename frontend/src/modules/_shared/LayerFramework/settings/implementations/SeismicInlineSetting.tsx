import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = number | null;

export class SeismicInlineSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getType(): SettingType {
        return SettingType.SEISMIC_INLINE;
    }

    getLabel(): string {
        return "Seismic inline";
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
        return function KRangeSlider(props: SettingComponentProps<ValueType>) {
            function handleSliderChange(_: any, value: number | number[]) {
                if (Array.isArray(value)) {
                    return value[0];
                }

                props.onValueChange(value);
            }
            function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
                props.onValueChange(Number(event.target.value));
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
                        <Input value={props.value} onChange={handleInputChange} />
                    </div>
                </div>
            );
        };
    }
}

SettingRegistry.registerSetting(SeismicInlineSetting);
