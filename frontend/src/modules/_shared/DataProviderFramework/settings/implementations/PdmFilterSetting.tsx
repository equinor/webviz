import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { debounce } from "lodash";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.PDM_FILTER]["internalValue"];
type ExternalValueType = SettingTypeDefinitions[Setting.PDM_FILTER]["externalValue"];
type ValueRangeType = SettingTypeDefinitions[Setting.PDM_FILTER]["valueRange"];

export class PdmFilterSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType, index: number) => {
            if (index === 0) {
                return valueRange;
            }

            if (accumulator === null || valueRange === null) {
                return null;
            }

            const mergedValueRange: ValueRangeType = accumulator;

            mergedValueRange.injection.gas = Math.max(mergedValueRange.injection.gas, valueRange.injection.gas);
            mergedValueRange.injection.water = Math.max(mergedValueRange.injection.water, valueRange.injection.water);
            mergedValueRange.production.oil = Math.max(mergedValueRange.production.oil, valueRange.production.oil);
            mergedValueRange.production.gas = Math.max(mergedValueRange.production.gas, valueRange.production.gas);
            mergedValueRange.production.water = Math.max(
                mergedValueRange.production.water,
                valueRange.production.water,
            );

            return mergedValueRange;
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType) => {
            return valueRange !== null;
        },
    };

    isValueValidStructure(value: unknown): value is InternalValueType {
        return true;
    }

    mapInternalToExternalValue(internalValue: InternalValueType): ExternalValueType {
        return internalValue;
    }

    isValueValid(value: InternalValueType, valueRange: ValueRangeType): boolean {
        if (value === null || valueRange === null) {
            return false;
        }

        return true;
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        return function WellboreDepthFilterSettingComponent(
            props: SettingComponentProps<InternalValueType, ValueRangeType>,
        ) {
            const { onValueChange } = props;

            function handleValueChange(
                type: "production" | "injection",
                phase: "oil" | "gas" | "water",
                newValue: number,
            ) {
                if (props.value === null) {
                    return;
                }

                const updatedValue: InternalValueType = {
                    ...props.value,
                    [type]: {
                        ...props.value[type],
                        [phase]: newValue,
                    },
                };

                onValueChange(updatedValue);
            }

            return (
                <div className="flex flex-col gap-1">
                    <div className="font-semibold">Production</div>
                    <SliderNumberSettingComponent
                        label="Oil"
                        maxValue={props.valueRange ? props.valueRange.production.oil : 0}
                        value={props.value ? props.value.production.oil : 0}
                        onValueChange={(newValue) => handleValueChange("production", "oil", newValue)}
                    />
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueRange ? props.valueRange.production.gas : 0}
                        value={props.value ? props.value.production.gas : 0}
                        onValueChange={(newValue) => handleValueChange("production", "gas", newValue)}
                    />
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueRange ? props.valueRange.production.water : 0}
                        value={props.value ? props.value.production.water : 0}
                        onValueChange={(newValue) => handleValueChange("production", "water", newValue)}
                    />
                    <div className="font-semibold mt-2">Injection</div>
                    <SliderNumberSettingComponent
                        label="Gas"
                        maxValue={props.valueRange ? props.valueRange.injection.gas : 0}
                        value={props.value ? props.value.injection.gas : 0}
                        onValueChange={(newValue) => handleValueChange("injection", "gas", newValue)}
                    />
                    <SliderNumberSettingComponent
                        label="Water"
                        maxValue={props.valueRange ? props.valueRange.injection.water : 0}
                        value={props.value ? props.value.injection.water : 0}
                        onValueChange={(newValue) => handleValueChange("injection", "water", newValue)}
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
    onValueChange: (newValue: number) => void;
};

function SliderNumberSettingComponent(props: SliderNumberSettingProps) {
    const { onValueChange } = props;

    const min = 0;
    const max = props.maxValue;
    const step = 1;

    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementSize(divRef);

    const MIN_DIV_WIDTH = 150;
    const inputVisible = divSize.width >= MIN_DIV_WIDTH;

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
            let value = Number(event.target.value);
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
        <div className="flex flex-row gap-2" ref={divRef}>
            <div className="text-sm flex items-center">{props.label}</div>
            <div className="flex-4">
                <Slider
                    min={min}
                    max={max}
                    onChange={handleSliderChange}
                    value={localValue}
                    valueLabelDisplay="auto"
                    step={step}
                />
            </div>
            <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputVisible })}>
                <Input type="number" value={localValue} min={min} max={max} onChange={handleInputChange} />
            </div>
        </div>
    );
}
