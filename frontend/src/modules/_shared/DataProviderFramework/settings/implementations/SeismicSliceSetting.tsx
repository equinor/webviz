import React from "react";

import { Visibility, VisibilityOff } from "@mui/icons-material";
import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { Button } from "@lib/newComponents/Button";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { Slider } from "@lib/newComponents/Slider";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = {
    value: [number, number, number];
    visible: [boolean, boolean, boolean];
    applied: boolean;
} | null;
type ValueConstraintsType = [[number, number, number], [number, number, number], [number, number, number]];
export class SeismicSliceSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueConstraintsType, valueConstraints: ValueConstraintsType) => {
            if (accumulator === null) {
                return valueConstraints;
            }

            const mergedRanges: ValueConstraintsType = [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            for (let i = 0; i < 3; i++) {
                const min = Math.max(accumulator[i][0], valueConstraints[i][0]);
                const max = Math.min(accumulator[i][1], valueConstraints[i][1]);
                const step = Math.max(accumulator[i][2], valueConstraints[i][2]);

                mergedRanges[i] = [min, max, step];
            }

            return mergedRanges;
        },
        startingValue: null,
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            const [xRange, yRange, zRange] = valueConstraints;
            return xRange[0] <= xRange[1] && yRange[0] <= yRange[1] && zRange[0] <= zRange[1];
        },
    };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;

        // Check 'value' property - must be [number, number, number]
        if (!Array.isArray(v.value) || v.value.length !== 3) {
            throw new Error("Expected 'value' to be array of 3 numbers");
        }
        if (!v.value.every((item) => typeof item === "number")) {
            throw new Error("Expected 'value' array elements to be numbers");
        }

        // Check 'visible' property - must be [boolean, boolean, boolean]
        if (!Array.isArray(v.visible) || v.visible.length !== 3) {
            throw new Error("Expected 'visible' to be array of 3 booleans");
        }
        if (!v.visible.every((item) => typeof item === "boolean")) {
            throw new Error("Expected 'visible' array elements to be booleans");
        }

        // Check 'applied' property - must be boolean
        if (typeof v.applied !== "boolean") {
            throw new Error("Expected 'applied' to be boolean");
        }

        return parsed as ValueType;
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        if (!currentValue || !Array.isArray(currentValue.value) || currentValue.value.length !== 3) {
            return {
                value: [valueConstraints[0][0], valueConstraints[1][0], valueConstraints[2][0]],
                visible: [true, true, true],
                applied: true,
            };
        }

        const fixedValue: [number, number, number] = currentValue.value.map((val, index) => {
            const [min, max, step] = valueConstraints[index];
            return Math.max(min, Math.min(max, Math.round(val / step) * step));
        }) as [number, number, number];

        return { value: fixedValue, visible: [true, true, true], applied: currentValue.applied };
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        if (!value || !Array.isArray(value.value) || value.value.length !== 3) {
            return false;
        }
        return value.value.every((val, index) => {
            const [min, max, step] = valueConstraints[index];
            return val >= min && val <= max && (val - min) % step === 0;
        });
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const valueConstraints = props.valueConstraints ?? [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            const [lastAppliedValue, setLastAppliedValue] = React.useState<ValueType>(props.value ?? null);

            const [internalValue, setInternalValue] = React.useState<[number, number, number] | null>(
                props.value?.value ?? null,
            );
            const [prevValue, setPrevValue] = React.useState<[number, number, number] | null>(null);

            if (!isEqual(prevValue, props.value?.value ?? null)) {
                setInternalValue(props.value?.value ?? [0, 0, 0]);
                setPrevValue(props.value?.value ?? null);
            }

            const [visible, setVisible] = React.useState<[boolean, boolean, boolean]>(
                props.value?.visible ?? [true, true, true],
            );
            const [prevVisible, setPrevVisible] = React.useState<[boolean, boolean, boolean] | null>(null);

            if (!isEqual(prevVisible, props.value?.visible ?? null)) {
                setVisible(props.value?.visible ?? [true, true, true]);
                setPrevVisible(props.value?.visible ?? null);
            }

            function handleSliderChange(index: number, val: number) {
                const newValue: [number, number, number] = [...(internalValue ?? [0, 0, 0])];
                newValue[index] = val;
                setInternalValue(newValue);
                props.onValueChange({ value: newValue, visible, applied: false });
            }

            function handleInputChange(index: number, val: number | null) {
                const min = valueConstraints[index][0];
                const max = valueConstraints[index][1];
                const step = valueConstraints[index][2];
                const allowedValues = Array.from(
                    { length: Math.floor((max - min) / step) + 1 },
                    (_, i) => min + i * step,
                );
                const newVal = allowedValues.reduce((prev, curr) =>
                    Math.abs(curr - (val ?? 0)) < Math.abs(prev - (val ?? 0)) ? curr : prev,
                );

                const newValue: [number, number, number] = [...(internalValue ?? [0, 0, 0])];
                newValue[index] = newVal;
                setInternalValue(newValue);
                props.onValueChange({ value: newValue, visible, applied: false });
            }

            function handleVisibleChange(index: number) {
                const newVisible: [boolean, boolean, boolean] = [...visible];
                newVisible[index] = !newVisible[index];
                setVisible(newVisible);
                props.onValueChange({ value: internalValue ?? [0, 0, 0], visible: newVisible, applied: false });
            }

            function handleRevertChanges() {
                props.onValueChange({
                    value: lastAppliedValue?.value ?? [0, 0, 0],
                    visible: lastAppliedValue?.visible ?? [true, true, true],
                    applied: true,
                });
            }

            function handleApplyChanges() {
                if (internalValue) {
                    props.onValueChange({ value: internalValue, visible, applied: true });
                    setLastAppliedValue({ value: internalValue, visible, applied: true });
                }
            }

            const labels: string[] = ["Col", "Row", "Depth"];
            const hasChanges = props.value === null || props.value.applied === false;
            const MIN_SIZE = 250;
            let inputsVisible = true;
            if (divSize.width < MIN_SIZE) {
                inputsVisible = false;
            }

            return (
                <>
                    <div className={resolveClassNames({ "outline-accent rounded outline-2": hasChanges })} ref={divRef}>
                        {labels.map((label, index) => (
                            <div key={`setting-${index}`} className="gap-x-sm flex items-center">
                                <div className="pl-2xs flex w-8 flex-col items-start">{label}</div>
                                <div className="min-w-4">
                                    <Button
                                        title="Toggle visibility"
                                        onClick={() => handleVisibleChange(index)}
                                        size="small"
                                        iconOnly
                                        variant="ghost"
                                        disabled={props.disabled}
                                    >
                                        {visible[index] ? (
                                            <Visibility fontSize="inherit" />
                                        ) : (
                                            <VisibilityOff fontSize="inherit" />
                                        )}
                                    </Button>
                                </div>
                                <div className="flex-4">
                                    <Slider
                                        min={valueConstraints[index][0]}
                                        max={valueConstraints[index][1]}
                                        onValueChange={(value) => handleSliderChange(index, value as number)}
                                        value={props.value?.value[index] ?? valueConstraints[index][0]}
                                        valueLabelDisplay="auto"
                                        step={valueConstraints[index][2]}
                                        disabled={props.disabled}
                                    />
                                </div>
                                <div className={resolveClassNames("min-w-16 flex-1", { hidden: !inputsVisible })}>
                                    <NumberInput
                                        value={internalValue?.[index] ?? 0}
                                        onValueChange={(value) => handleInputChange(index, value)}
                                        disabled={props.disabled}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2xs gap-x-2xs flex justify-end">
                        <Button
                            variant="ghost"
                            tone="danger"
                            onClick={handleRevertChanges}
                            disabled={!hasChanges || props.disabled}
                            size="small"
                        >
                            Revert
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyChanges}
                            disabled={!hasChanges || props.disabled}
                            size="small"
                        >
                            Apply
                        </Button>
                    </div>
                </>
            );
        };
    }
}
