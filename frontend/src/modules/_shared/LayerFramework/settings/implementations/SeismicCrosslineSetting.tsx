import React from "react";

import { Slider } from "@lib/components/Slider";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = number | null;

export class SeismicCrosslineSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(null, this);
    }

    getType(): SettingType {
        return SettingType.SEISMIC_CROSSLINE;
    }

    getLabel(): string {
        return "Seismic Crossline number";
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

        const min = availableValues[1];
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
            function handleChange(_: any, value: number | number[]) {
                if (Array.isArray(value)) {
                    return value[0];
                }

                props.onValueChange(value);
            }

            return (
                <Slider
                    min={0}
                    max={props.availableValues[1] ?? 1}
                    onChange={handleChange}
                    value={props.value ?? props.availableValues[0] ?? 1}
                    debounceTimeMs={500}
                    valueLabelDisplay="auto"
                />
            );
        };
    }
}

SettingRegistry.registerSetting(SeismicCrosslineSetting);
