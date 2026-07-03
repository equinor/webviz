import React from "react";

import { clamp } from "lodash-es";

import { ColorSelect } from "@lib/components/ColorSelect";
import { NumberInput } from "@lib/components/NumberInput";
import { Slider } from "@lib/components/Slider";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FLOW_COLORS } from "@modules/_shared/constants/colors";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.FLOW_FILTER]["internalValue"];
type ExternalValueType = SettingTypeDefinitions[Setting.FLOW_FILTER]["externalValue"];
type ValueRangeType = SettingTypeDefinitions[Setting.FLOW_FILTER]["valueConstraints"];

export class FlowFilterSetting implements CustomSettingImplementation<
    InternalValueType,
    ExternalValueType,
    ValueRangeType
> {
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
            mergedValueRange.injection.water = Math.max(
                mergedValueRange.injection.water,
                valueConstraints.injection.water,
            );
            mergedValueRange.production.oil = Math.max(
                mergedValueRange.production.oil,
                valueConstraints.production.oil,
            );
            mergedValueRange.production.gas = Math.max(
                mergedValueRange.production.gas,
                valueConstraints.production.gas,
            );
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

        return (
            value.production.oil.value === clamp(value.production.oil.value, 0, valueConstraints.production.oil) &&
            value.production.gas.value === clamp(value.production.gas.value, 0, valueConstraints.production.gas) &&
            value.production.water.value ===
                clamp(value.production.water.value, 0, valueConstraints.production.water) &&
            value.injection.gas.value === clamp(value.injection.gas.value, 0, valueConstraints.injection.gas) &&
            value.injection.water.value === clamp(value.injection.water.value, 0, valueConstraints.injection.water)
        );
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueRangeType): InternalValueType {
        if (valueConstraints === null) {
            return null;
        }

        if (currentValue === null) {
            return {
                production: {
                    oil: { value: 0, color: FLOW_COLORS.oil_production },
                    gas: { value: 0, color: FLOW_COLORS.gas_production },
                    water: { value: 0, color: FLOW_COLORS.water_production },
                },
                injection: {
                    water: { value: 0, color: FLOW_COLORS.water_injection },
                    gas: { value: 0, color: FLOW_COLORS.gas_injection },
                },
            };
        }

        return {
            production: {
                oil: {
                    value: clamp(currentValue.production.oil.value, 0, valueConstraints.production.oil),
                    color: currentValue.production.oil.color,
                },
                gas: {
                    value: clamp(currentValue.production.gas.value, 0, valueConstraints.production.gas),
                    color: currentValue.production.gas.color,
                },
                water: {
                    value: clamp(currentValue.production.water.value, 0, valueConstraints.production.water),
                    color: currentValue.production.water.color,
                },
            },
            injection: {
                water: {
                    value: clamp(currentValue.injection.water.value, 0, valueConstraints.injection.water),
                    color: currentValue.injection.water.color,
                },
                gas: {
                    value: clamp(currentValue.injection.gas.value, 0, valueConstraints.injection.gas),
                    color: currentValue.injection.gas.color,
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

            const MIN_DIV_WIDTH = 350;
            const inputVisible = divSize.width >= MIN_DIV_WIDTH;

            function makeDefaultValue() {
                return {
                    production: {
                        oil: { value: 0, color: FLOW_COLORS.oil_production },
                        gas: { value: 0, color: FLOW_COLORS.gas_production },
                        water: { value: 0, color: FLOW_COLORS.water_production },
                    },
                    injection: {
                        water: { value: 0, color: FLOW_COLORS.water_injection },
                        gas: { value: 0, color: FLOW_COLORS.gas_injection },
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
                    className="gap-x-2xs gap-y-3xs grid items-center"
                    ref={divRef}
                    style={{ gridTemplateColumns: inputVisible ? "24px 40px 1fr 6rem " : "24px 40px auto" }}
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
                        color={props.value ? props.value.production.oil.color : FLOW_COLORS.oil_production}
                        onValueChange={(newValue) => handleValueChange("production", "oil", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "oil", newColor)}
                        inputVisible={inputVisible}
                        disabled={props.disabled}
                    />
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueConstraints ? props.valueConstraints.production.gas : 0}
                        value={props.value ? props.value.production.gas.value : 0}
                        color={props.value ? props.value.production.gas.color : FLOW_COLORS.gas_production}
                        onValueChange={(newValue) => handleValueChange("production", "gas", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "gas", newColor)}
                        inputVisible={inputVisible}
                        disabled={props.disabled}
                    />
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueConstraints ? props.valueConstraints.production.water : 0}
                        value={props.value ? props.value.production.water.value : 0}
                        color={props.value ? props.value.production.water.color : FLOW_COLORS.water_production}
                        onValueChange={(newValue) => handleValueChange("production", "water", newValue)}
                        onColorChange={(newColor) => handleColorChange("production", "water", newColor)}
                        inputVisible={inputVisible}
                        disabled={props.disabled}
                    />
                    <div
                        className={resolveClassNames("mt-2 font-semibold", {
                            "col-span-4": inputVisible,
                            "col-span-3": !inputVisible,
                        })}
                    >
                        Injection
                    </div>
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueConstraints ? props.valueConstraints.injection.water : 0}
                        value={props.value ? props.value.injection.water.value : 0}
                        color={props.value ? props.value.injection.water.color : FLOW_COLORS.water_injection}
                        onValueChange={(newValue) => handleValueChange("injection", "water", newValue)}
                        onColorChange={(newColor) => handleColorChange("injection", "water", newColor)}
                        inputVisible={inputVisible}
                        disabled={props.disabled}
                    />
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueConstraints ? props.valueConstraints.injection.gas : 0}
                        value={props.value ? props.value.injection.gas.value : 0}
                        color={props.value ? props.value.injection.gas.color : FLOW_COLORS.gas_injection}
                        onValueChange={(newValue) => handleValueChange("injection", "gas", newValue)}
                        onColorChange={(newColor) => handleColorChange("injection", "gas", newColor)}
                        inputVisible={inputVisible}
                        disabled={props.disabled}
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
    disabled?: boolean;
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

    const debouncedOnValueChange = useDebouncedFunction(onValueChange, 500);

    const handleSliderChange = React.useCallback(
        function handleSliderChange(value: number | readonly number[]) {
            const newValue = Array.isArray(value) ? value[0] : value;
            setLocalValue(newValue);
            debouncedOnValueChange(newValue);
        },
        [debouncedOnValueChange],
    );

    const handleInputChange = React.useCallback(
        function handleInputChange(value: number | null) {
            let numericValue = (value ?? 0) * 1000;
            const allowedValues = Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
            numericValue = allowedValues.reduce((prev, curr) =>
                Math.abs(curr - numericValue) < Math.abs(prev - numericValue) ? curr : prev,
            );

            setLocalValue(numericValue);
            debouncedOnValueChange(numericValue);
        },
        [debouncedOnValueChange, min, max, step],
    );

    return (
        <>
            <ColorSelect
                value={props.color}
                onValueChange={props.onColorChange}
                size="small"
                compact
                variant="ghost"
                disabled={props.disabled}
            />
            <div className="text-body-sm">{props.label}</div>
            <Slider
                layoutClassName="grow"
                size="small"
                min={min}
                max={max}
                onValueChange={handleSliderChange}
                value={localValue}
                valueLabelDisplay="auto"
                valueLabelFormat={(val: number) => formatNumber(val)}
                step={step}
                inverted
                disabled={props.disabled}
            />
            {props.inputVisible && (
                <NumberInput
                    size="small"
                    value={localValue / 1000}
                    min={min / 1000}
                    max={max / 1000}
                    onValueChange={handleInputChange}
                    endAdornment="K"
                    disabled={props.disabled}
                />
            )}
        </>
    );
}
