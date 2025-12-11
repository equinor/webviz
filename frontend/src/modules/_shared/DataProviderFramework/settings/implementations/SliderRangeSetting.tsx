import React from "react";

import { Lock, LockOpen } from "@mui/icons-material";
import { debounce, isEqual } from "lodash";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { ToggleButton } from "@lib/components/ToggleButton";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isNumberOrStringTuple } from "../utils/structureValidation";

type InternalValueType = [number | "min", number | "max"] | null;
type ExternalValueType = [number, number] | null;
type ValueRangeType = [number, number, number]; // [min, max, step]

export class SliderRangeSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    private _staticOptions: { minMax: { min: number; max: number }; step: number } | null;

    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType) => {
            if (accumulator === null) {
                return valueRange;
            }

            const min = Math.max(accumulator[0], valueRange[0]);
            const max = Math.min(accumulator[1], valueRange[1]);
            const step = Math.max(accumulator[2], valueRange[2]);

            return [min, max, step] as ValueRangeType;
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType): boolean => {
            return valueRange[0] <= valueRange[1] && valueRange[2] > 0;
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

    mapInternalToExternalValue(internalValue: InternalValueType, valueRange: ValueRangeType): ExternalValueType {
        if (internalValue === null || valueRange === null || valueRange.length !== 3) {
            return null;
        }

        const externalValue: ExternalValueType = [
            internalValue[0] === "min" ? valueRange[0] : internalValue[0],
            internalValue[1] === "max" ? valueRange[1] : internalValue[1],
        ];
        return externalValue;
    }

    isValueValidStructure(value: unknown): value is InternalValueType {
        return isNumberOrStringTuple(value, 2) || value === null;
    }

    getIsStatic(): boolean {
        // If static options are provided in constructor, the setting is defined as static
        return this._staticOptions !== null;
    }

    isValueValid(value: InternalValueType, valueRange: ValueRangeType): boolean {
        // If static limits are provided, Input- and Slider-component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticOptions) {
            return true;
        }

        const min = valueRange[0];
        const max = valueRange[1];

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

    fixupValue(currentValue: InternalValueType, valueRange: ValueRangeType): InternalValueType {
        // If static options are provided, return value as Input- and Slider-component controls the value
        if (this._staticOptions) {
            return currentValue;
        }

        const min = valueRange[0];
        const max = valueRange[1];

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

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        const staticOptions = this._staticOptions;
        const isStatic = staticOptions !== null;

        return function InputRangeSetting(props: SettingComponentProps<InternalValueType, ValueRangeType>) {
            const { onValueChange } = props;

            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const MIN_DIV_WIDTH = 250;
            const inputVisible = divSize.width >= MIN_DIV_WIDTH;

            const min = isStatic ? (staticOptions.minMax.min ?? 0) : (props.valueRange?.[0] ?? 0);
            const max = isStatic ? (staticOptions.minMax.max ?? 0) : (props.valueRange?.[1] ?? 0);
            const step = isStatic ? (staticOptions.step ?? 1) : (props.valueRange?.[2] ?? 1);

            const [prevValue, setPrevValue] = React.useState(props.value);
            const [localValue, setLocalValue] = React.useState(props.value ?? [min, max]);

            // Update local value when props value changes
            if (!isEqual(props.value, prevValue)) {
                setPrevValue(props.value);
                setLocalValue(props.value ?? [min, max]);
            }

            // Create debounced update function with useRef to preserve reference
            const debouncedOnValueChange = React.useRef(
                debounce((value: [number | "min", number | "max"]) => {
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
                    setLocalValue((prev) => {
                        const val = Array.isArray(value) ? value : [value, value];
                        const newValue: [number | "min", number | "max"] = [prev[0], prev[1]];
                        if (newValue[0] === "min" && val[0] === min) {
                            newValue[0] = "min";
                        } else {
                            newValue[0] = val[0];
                        }
                        if (newValue[1] === "max" && val[1] === max) {
                            newValue[1] = "max";
                        } else {
                            newValue[1] = val[1];
                        }
                        debouncedOnValueChange(newValue);
                        return newValue;
                    });
                },
                [debouncedOnValueChange, min, max],
            );

            const handleInputChange = React.useCallback(
                function handleInputChange(
                    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                    index: number,
                ) {
                    let value = Number(event.target.value);
                    const allowedValues = Array.from(
                        { length: Math.floor((max - min) / step) + 1 },
                        (_, i) => min + i * step,
                    );
                    value = allowedValues.reduce((prev, curr) =>
                        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
                    );

                    setLocalValue((prev) => {
                        const newValue: [number | "min", number | "max"] = [prev[0], prev[1]];
                        newValue[index] = value;
                        debouncedOnValueChange(newValue);
                        return newValue;
                    });
                },
                [debouncedOnValueChange, min, max, step],
            );

            const handleLockMinToggle = React.useCallback(
                function handleLockMinToggle() {
                    setLocalValue((prev) => {
                        const newValue: [number | "min", number | "max"] = [prev[0], prev[1]];
                        if (newValue[0] === "min") {
                            newValue[0] = min;
                        } else {
                            newValue[0] = "min";
                        }
                        debouncedOnValueChange(newValue);
                        return newValue;
                    });
                },
                [debouncedOnValueChange, min],
            );

            const handleLockMaxToggle = React.useCallback(
                function handleLockMaxToggle() {
                    setLocalValue((prev) => {
                        const newValue: [number | "min", number | "max"] = [prev[0], prev[1]];
                        if (newValue[1] === "max") {
                            newValue[1] = max;
                        } else {
                            newValue[1] = "max";
                        }
                        debouncedOnValueChange(newValue);
                        return newValue;
                    });
                },
                [debouncedOnValueChange, max],
            );

            return (
                <div className="flex flex-row gap-1 items-center" ref={divRef}>
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputVisible })}>
                        <Input
                            type="number"
                            value={localValue[0] === "min" ? min : localValue[0]}
                            min={min}
                            max={max}
                            onChange={(event) => handleInputChange(event, 0)}
                        />
                    </div>
                    <ToggleButton size="small" active={localValue[0] === "min"} onToggle={handleLockMinToggle}>
                        {localValue[0] === "min" ? <Lock fontSize="inherit" /> : <LockOpen fontSize="inherit" />}
                    </ToggleButton>
                    <div className="flex-4">
                        <Slider
                            min={min}
                            max={max}
                            onChange={handleSliderChange}
                            value={[
                                localValue[0] === "min" ? min : localValue[0],
                                localValue[1] === "max" ? max : localValue[1],
                            ]}
                            valueLabelDisplay="auto"
                            step={step}
                        />
                    </div>
                    <ToggleButton size="small" active={localValue[1] === "max"} onToggle={handleLockMaxToggle}>
                        {localValue[1] === "max" ? <Lock fontSize="inherit" /> : <LockOpen fontSize="inherit" />}
                    </ToggleButton>
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputVisible })}>
                        <Input
                            type="number"
                            value={localValue[1] === "max" ? max : localValue[1]}
                            min={min}
                            max={max}
                            onChange={(event) => handleInputChange(event, 1)}
                        />
                    </div>
                </div>
            );
        };
    }
}
