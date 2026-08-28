import React from "react";

import { isEqual } from "lodash-es";

import { Slider } from "@lib/components/Slider";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertNumberOrStringTuple, isNumberOrStringTuple } from "../utils/structureValidation";

type InternalValueType = [number | "min", number | "max"] | null;
type ExternalValueType = [number, number] | null;
type ValueConstraintsType = [min: number, max: number, step: number];

export class SliderRangeSetting implements CustomSettingImplementation<
    InternalValueType,
    ExternalValueType,
    ValueConstraintsType
> {
    private _staticOptions: { minMax: { min: number; max: number }; step: number } | null;

    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueConstraintsType, valueConstraints: ValueConstraintsType) => {
            if (accumulator === null) {
                return valueConstraints;
            }

            const min = Math.max(accumulator[0], valueConstraints[0]);
            const max = Math.min(accumulator[1], valueConstraints[1]);
            const step = Math.max(accumulator[2], valueConstraints[2]);

            return [min, max, step] as ValueConstraintsType;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            return valueConstraints[0] <= valueConstraints[1] && valueConstraints[2] > 0;
        },
    };

    constructor(staticOptions?: { minMax: { min: number; max: number }; step: number }) {
        if (staticOptions) {
            if (staticOptions.minMax.min > staticOptions.minMax.max) {
                throw new Error("Min value cannot be greater than max value");
            }
            if (staticOptions.step <= 0) {
                throw new Error("Step value must be greater than 0");
            }
            if (staticOptions.step > staticOptions.minMax.max - staticOptions.minMax.min) {
                throw new Error("Step value cannot be greater than the range");
            }
        }

        this._staticOptions = staticOptions ?? null;
    }

    mapInternalToExternalValue(
        internalValue: InternalValueType,
        valueConstraints: ValueConstraintsType,
    ): ExternalValueType {
        if (internalValue === null || valueConstraints === null || valueConstraints.length !== 3) {
            return null;
        }

        const externalValue: ExternalValueType = [
            internalValue[0] === "min" ? valueConstraints[0] : internalValue[0],
            internalValue[1] === "max" ? valueConstraints[1] : internalValue[1],
        ];
        return externalValue;
    }

    isValueValidStructure(value: unknown): value is InternalValueType {
        return isNumberOrStringTuple(value);
    }

    getIsStatic(): boolean {
        // If static options are provided in constructor, the setting is defined as static
        return this._staticOptions !== null;
    }

    isValueValid(value: InternalValueType, valueConstraints: ValueConstraintsType): boolean {
        // If static limits are provided, Input- and Slider-component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticOptions) {
            return true;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (
            value === null ||
            value.length !== 2 ||
            (value[0] !== "min" && value[0] < min) ||
            (value[1] !== "max" && value[1] > max) ||
            (typeof value[0] === "number" && typeof value[1] === "number" && value[0] > value[1])
        ) {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueConstraintsType): InternalValueType {
        // If static options are provided, return value as Input- and Slider-component controls the value
        if (this._staticOptions) {
            return currentValue;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (currentValue === null || currentValue.length !== 2) {
            return ["min", "max"];
        }

        const fixedValue: InternalValueType = [currentValue[0], currentValue[1]];

        if (currentValue[0] !== "min" && currentValue[0] < min) {
            fixedValue[0] = min;
        }
        if (currentValue[1] !== "max" && currentValue[1] > max) {
            fixedValue[1] = max;
        }
        if (typeof fixedValue[0] === "number" && typeof fixedValue[1] === "number" && fixedValue[0] > fixedValue[1]) {
            fixedValue[0] = fixedValue[1];
        }

        return fixedValue;
    }

    serializeValue(value: InternalValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): InternalValueType {
        const parsed = JSON.parse(serializedValue);
        assertNumberOrStringTuple(parsed);
        return parsed as InternalValueType;
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueConstraintsType>) => React.ReactNode {
        const staticOptions = this._staticOptions;
        const isStatic = staticOptions !== null;

        return function InputRangeSetting(props: SettingComponentProps<InternalValueType, ValueConstraintsType>) {
            const { onValueChange } = props;

            const min = isStatic ? (staticOptions.minMax.min ?? 0) : (props.valueConstraints?.[0] ?? 0);
            const max = isStatic ? (staticOptions.minMax.max ?? 0) : (props.valueConstraints?.[1] ?? 0);
            const step = isStatic ? (staticOptions.step ?? 1) : (props.valueConstraints?.[2] ?? 1);

            const [prevValue, setPrevValue] = React.useState<InternalValueType>(props.value);
            const [localValue, setLocalValue] = React.useState<NonNullable<InternalValueType>>(
                props.value ?? ["min", "max"],
            );

            // Update local value when props value changes
            if (!isEqual(props.value, prevValue)) {
                setPrevValue(props.value);
                setLocalValue(props.value ?? ["min", "max"]);
            }

            const debouncedOnValueChange = useDebouncedFunction(onValueChange, 500);

            const handleSliderChange = React.useCallback(
                function handleSliderChange(value: number | readonly number[], eventDetails: { reason: string }) {
                    if (eventDetails.reason === "range-locked") return;
                    setLocalValue((prev) => {
                        const val = Array.isArray(value) ? value : [value, value];
                        const keepMin = prev[0] === "min" && (eventDetails.reason === "clamp-value" || val[0] === min);
                        const keepMax = prev[1] === "max" && (eventDetails.reason === "clamp-value" || val[1] === max);
                        const newValue: [number | "min", number | "max"] = [
                            keepMin ? "min" : val[0],
                            keepMax ? "max" : val[1],
                        ];
                        debouncedOnValueChange(newValue);
                        return newValue;
                    });
                },
                [debouncedOnValueChange, min, max],
            );

            function handleMinLockedChange(locked: boolean) {
                setLocalValue((prev) => {
                    if (locked) {
                        const newValue: [number | "min", number | "max"] = ["min", prev[1]];
                        debouncedOnValueChange(newValue);
                        return newValue;
                    }
                    if (prev[0] !== "min") return prev;
                    const newValue: [number | "min", number | "max"] = [min, prev[1]];
                    debouncedOnValueChange(newValue);
                    return newValue;
                });
            }

            function handleMaxLockedChange(locked: boolean) {
                setLocalValue((prev) => {
                    if (locked) {
                        const newValue: [number | "min", number | "max"] = [prev[0], "max"];
                        debouncedOnValueChange(newValue);
                        return newValue;
                    }
                    if (prev[1] !== "max") return prev;
                    const newValue: [number | "min", number | "max"] = [prev[0], max];
                    debouncedOnValueChange(newValue);
                    return newValue;
                });
            }

            return (
                <div className="gap-x-2xs">
                    <Slider
                        min={min}
                        max={max}
                        onValueChange={handleSliderChange}
                        value={[
                            localValue[0] === "min" ? min : localValue[0],
                            localValue[1] === "max" ? max : localValue[1],
                        ]}
                        valueLabelDisplay="auto"
                        step={step}
                        showRangeLocks
                        minLocked={localValue[0] === "min"}
                        maxLocked={localValue[1] === "max"}
                        onMinLockedChange={handleMinLockedChange}
                        onMaxLockedChange={handleMaxLockedChange}
                        disabled={props.disabled}
                    />
                </div>
            );
        };
    }
}
