import React from "react";

import { debounce } from "lodash";

import { ColorSelect } from "@lib/components/ColorSelect";
import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { PHASE_COLORS } from "@modules/_shared/constants/colors";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.PDM_FILTER]["internalValue"];
type ExternalValueType = SettingTypeDefinitions[Setting.PDM_FILTER]["externalValue"];
type ValueRangeType = SettingTypeDefinitions[Setting.PDM_FILTER]["valueConstraints"];

export class PdmFilterSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueConstraints: ValueRangeType, index: number) => {
            if (index === 0) {
                return valueConstraints;
            }

            if (accumulator === null || valueConstraints === null) {
                return null;
            }

            const mergedValueRange: ValueRangeType = accumulator;

            mergedValueRange.injection.gas = Math.max(mergedValueRange.injection.gas, valueConstraints.injection.gas);
            mergedValueRange.injection.water = Math.max(mergedValueRange.injection.water, valueConstraints.injection.water);
            mergedValueRange.production.oil = Math.max(mergedValueRange.production.oil, valueConstraints.production.oil);
            mergedValueRange.production.gas = Math.max(mergedValueRange.production.gas, valueConstraints.production.gas);
            mergedValueRange.production.water = Math.max(
                mergedValueRange.production.water,
                valueConstraints.production.water,
            );

            return mergedValueRange;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueRangeType) => {
            return valueConstraints !== null;
        },
    };

    isValueValidStructure(value: unknown): value is InternalValueType {
        if (value === null) {
            return true;
        }

        if (typeof value !== "object" || value === null) {
            return false;
        }

        const v = value as Record<string, unknown>;

        // Helper to check phase object structure
        const isValidPhase = (phase: unknown): boolean => {
            if (typeof phase !== "object" || phase === null) {
                return false;
            }
            const p = phase as Record<string, unknown>;
            return typeof p.value === "number" && typeof p.color === "string";
        };

        // Check production object
        if (typeof v.production !== "object" || v.production === null) {
            return false;
        }
        const production = v.production as Record<string, unknown>;
        if (!isValidPhase(production.oil) || !isValidPhase(production.gas) || !isValidPhase(production.water)) {
            return false;
        }

        // Check injection object
        if (typeof v.injection !== "object" || v.injection === null) {
            return false;
        }
        const injection = v.injection as Record<string, unknown>;
        if (!isValidPhase(injection.gas) || !isValidPhase(injection.water)) {
            return false;
        }

        return true;
    }

    mapInternalToExternalValue(internalValue: InternalValueType): ExternalValueType {
        return internalValue;
    }

    isValueValid(value: InternalValueType, valueConstraints: ValueRangeType): boolean {
        if (value === null || valueConstraints === null) {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueRangeType): InternalValueType {
        if (valueConstraints === null) {
            return null;
        }

        if (currentValue === null) {
            return {
                production: {
                    oil: { value: 0, color: "#8B4513" },
                    gas: { value: 0, color: "#FF0000" },
                    water: { value: 0, color: "#0000FF" },
                },
                injection: {
                    gas: { value: 0, color: "#FF0000" },
                    water: { value: 0, color: "#0000FF" },
                },
            };
        }

        return {
            production: {
                oil: {
                    value: Math.min(currentValue.production.oil.value, 0),
                    color: currentValue.production.oil.color,
                },
                gas: {
                    value: Math.min(currentValue.production.gas.value, 0),
                    color: currentValue.production.gas.color,
                },
                water: {
                    value: Math.min(currentValue.production.water.value, 0),
                    color: currentValue.production.water.color,
                },
            },
            injection: {
                gas: {
                    value: Math.min(currentValue.injection.gas.value, 0),
                    color: currentValue.injection.gas.color,
                },
                water: {
                    value: Math.min(currentValue.injection.water.value, 0),
                    color: currentValue.injection.water.color,
                },
            },
        };
    }

    serializeValue(value: InternalValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): InternalValueType {
        return JSON.parse(serializedValue);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        return function WellboreDepthFilterSettingComponent(
            props: SettingComponentProps<InternalValueType, ValueRangeType>,
        ) {
            const { onValueChange } = props;

            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const MIN_DIV_WIDTH = 250;
            const inputVisible = divSize.width >= MIN_DIV_WIDTH;

            function makeDefaultValue() {
                return {
                    production: {
                        oil: { value: 0, color: PHASE_COLORS.oil },
                        gas: { value: 0, color: PHASE_COLORS.gas },
                        water: { value: 0, color: PHASE_COLORS.water },
                    },
                    injection: {
                        gas: { value: 0, color: PHASE_COLORS.gas },
                        water: { value: 0, color: PHASE_COLORS.water },
                    },
                };
            }

            function handleValueChange(
                type: "production" | "injection",
                phase: "oil" | "gas" | "water",
                newValue: number,
            ) {
                onValueChange((prev) => {
                    const baseValue = prev ?? makeDefaultValue();

                    if (type === "production") {
                        return {
                            ...baseValue,
                            production: {
                                ...baseValue.production,
                                [phase]: {
                                    ...baseValue.production[phase],
                                    value: newValue,
                                },
                            },
                        };
                    } else {
                        // type === "injection", only gas and water are valid
                        return {
                            ...baseValue,
                            injection: {
                                ...baseValue.injection,
                                [phase]: {
                                    ...(baseValue.injection as any)[phase],
                                    value: newValue,
                                },
                            },
                        };
                    }
                });
            }

            function handleColorChange(
                type: "production" | "injection",
                phase: "oil" | "gas" | "water",
                newColor: string,
            ) {
                onValueChange((prev) => {
                    const baseValue = prev ?? makeDefaultValue();

                    if (type === "production") {
                        return {
                            ...baseValue,
                            production: {
                                ...baseValue.production,
                                [phase]: {
                                    ...baseValue.production[phase],
                                    color: newColor,
                                },
                            },
                        };
                    } else {
                        // type === "injection", only gas and water are valid
                        return {
                            ...baseValue,
                            injection: {
                                ...baseValue.injection,
                                [phase]: {
                                    ...(baseValue.injection as any)[phase],
                                    color: newColor,
                                },
                            },
                        };
                    }
                });
            }

            return (
                <div
                    className="grid gap-y-1 gap-x-2 items-center"
                    ref={divRef}
                    style={{ gridTemplateColumns: inputVisible ? "24px 40px 3fr 1fr" : "24px 40px auto" }}
                >
                    <div
                        className={resolveClassNames("font-semibold", {
                            "col-span-4": inputVisible,
                            "col-span-3": !inputVisible,
                        })}
                    >
                        Production
                    </div>
                    <SliderNumberSettingComponent
                        label="Oil"
                        maxValue={props.valueConstraints ? props.valueConstraints.production.oil : 0}
                        value={props.value ? props.value.production.oil.value : 0}
                        color={props.value ? props.value.production.oil.color : PHASE_COLORS.oil}
                        onValueChange={(newValue) => handleValueChange("production", "oil", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "oil", newColor)}
                        inputVisible={inputVisible}
                    />
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueConstraints ? props.valueConstraints.production.gas : 0}
                        value={props.value ? props.value.production.gas.value : 0}
                        color={props.value ? props.value.production.gas.color : PHASE_COLORS.gas}
                        onValueChange={(newValue) => handleValueChange("production", "gas", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "gas", newColor)}
                        inputVisible={inputVisible}
                    />
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueConstraints ? props.valueConstraints.production.water : 0}
                        value={props.value ? props.value.production.water.value : 0}
                        color={props.value ? props.value.production.water.color : PHASE_COLORS.water}
                        onValueChange={(newValue) => handleValueChange("production", "water", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "water", newColor)}
                        inputVisible={inputVisible}
                    />
                    <div
                        className={resolveClassNames("font-semibold mt-2", {
                            "col-span-4": inputVisible,
                            "col-span-3": !inputVisible,
                        })}
                    >
                        Injection
                    </div>
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueConstraints ? props.valueConstraints.injection.gas : 0}
                        value={props.value ? props.value.injection.gas.value : 0}
                        color={props.value ? props.value.injection.gas.color : PHASE_COLORS.gas}
                        onValueChange={(newValue) => handleValueChange("injection", "gas", newValue)}
                        onColorChange={(newColor) => handleColorChange("injection", "gas", newColor)}
                        inputVisible={inputVisible}
                    />
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueConstraints ? props.valueConstraints.injection.water : 0}
                        value={props.value ? props.value.injection.water.value : 0}
                        color={props.value ? props.value.injection.water.color : PHASE_COLORS.water}
                        onValueChange={(newValue) => handleValueChange("injection", "water", newValue)}
                        onColorChange={(newColor) => handleColorChange("injection", "water", newColor)}
                        inputVisible={inputVisible}
                    />
                </div>
            );
        };
    }
}

type SliderNumberSettingProps = {
    label: string;
    maxValue: number;
    value: number;
    color: string;
    onValueChange: (newValue: number) => void;
    onColorChange: (newColor: string) => void;
    inputVisible: boolean;
};

function SliderNumberSettingComponent(props: SliderNumberSettingProps) {
    const { onValueChange } = props;

    const min = 0;
    const max = props.maxValue;
    const step = 1000;

    const [prevValue, setPrevValue] = React.useState(props.value ?? min);
    const [localValue, setLocalValue] = React.useState(props.value ?? min);

    // Update local value when props value changes
    if (props.value !== prevValue) {
        setPrevValue(props.value ?? min);
        setLocalValue(props.value ?? min);
    }

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
            let value = Number(event.target.value) * 1000;
            const allowedValues = Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
            value = allowedValues.reduce((prev, curr) =>
                Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
            );

            setLocalValue(value);
            debouncedOnValueChange(value);
        },
        [debouncedOnValueChange, min, max, step],
    );

    return (
        <>
            <ColorSelect value={props.color} onChange={props.onColorChange} dense />
            <div className="text-sm">{props.label}</div>
            <Slider
                min={min}
                max={max}
                onChange={handleSliderChange}
                value={localValue}
                valueLabelDisplay="auto"
                valueLabelFormat={(val) => formatNumber(val)}
                step={step}
                track="inverted"
                color=""
            />
            {props.inputVisible && (
                <Input
                    type="number"
                    value={localValue / 1000}
                    min={min / 1000}
                    max={max / 1000}
                    onChange={handleInputChange}
                    endAdornment="K"
                    className="min-w-20"
                />
            )}
        </>
    );
}
