import React from "react";

import { debounce } from "lodash";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertNumberOrNull } from "../utils/structureValidation";

type ValueType = number | null;
type ValueConstraintsType = [number, number, number]; // [min, max, step]

export class SliderNumberSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
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

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    getIsStatic(): boolean {
        // If static options are provided in constructor, the setting is defined as static
        return this._staticOptions !== null;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        // If static limits are provided, Input- and Slider-component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticOptions) {
            return true;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (value === null || value > max || value < min) {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        // If static options are provided, return value as Input- and Slider-component controls the value
        if (this._staticOptions) {
            return currentValue;
        }

        const min = valueConstraints[0];
        const max = valueConstraints[1];

        if (currentValue === null || currentValue < min) {
            return min;
        }
        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        assertNumberOrNull(parsed);
        return parsed;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const staticOptions = this._staticOptions;
        const isStatic = staticOptions !== null;

        return function InputNumberSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const { onValueChange } = props;

            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const MIN_DIV_WIDTH = 150;
            const inputVisible = divSize.width >= MIN_DIV_WIDTH;

            const min = isStatic ? (staticOptions.minMax.min ?? 0) : (props.valueConstraints?.[0] ?? 0);
            const max = isStatic ? (staticOptions.minMax.max ?? 0) : (props.valueConstraints?.[1] ?? 0);
            const step = isStatic ? (staticOptions.step ?? 1) : (props.valueConstraints?.[2] ?? 1);

            const [prevValue, setPrevValue] = React.useState(props.value ?? min);
            const [localValue, setLocalValue] = React.useState(props.value ?? min);

            // Update local value when props value changes
            if (props.value !== prevValue) {
                setPrevValue(props.value ?? min);
                setLocalValue(props.value ?? min);
            }

            // Create debounced update function with useRef to preserve reference
            const debouncedOnValueChange = React.useRef(
                debounce((value: number) => {
                    onValueChange(value);
                }, 500),
            ).current;

            // Clean up debounce on unmount
            React.useEffect(() => {
                return () => {
                    debouncedOnValueChange.cancel();
                };
            }, [debouncedOnValueChange]);

            const handleSliderChange = React.useCallback(
                function handleSliderChange(_: any, value: number | number[]) {
                    const newValue = Array.isArray(value) ? value[0] : value;
                    setLocalValue(newValue);
                    debouncedOnValueChange(newValue);
                },
                [debouncedOnValueChange],
            );

            const handleInputChange = React.useCallback(
                function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
                    let value = Number(event.target.value);
                    const allowedValues = Array.from(
                        { length: Math.floor((max - min) / step) + 1 },
                        (_, i) => min + i * step,
                    );
                    value = allowedValues.reduce((prev, curr) =>
                        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
                    );

                    setLocalValue(value);
                    debouncedOnValueChange(value);
                },
                [debouncedOnValueChange, min, max, step],
            );

            const displayValue = !props.isOverridden ? localValue : (props.overriddenValue ?? min);
            return (
                <div className="flex flex-row gap-2" ref={divRef}>
                    <div className="flex-4">
                        <Slider
                            min={min}
                            max={max}
                            onChange={handleSliderChange}
                            value={displayValue}
                            valueLabelDisplay="auto"
                            step={step}
                        />
                    </div>
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputVisible })}>
                        <Input type="number" value={displayValue} min={min} max={max} onChange={handleInputChange} />
                    </div>
                </div>
            );
        };
    }
}
