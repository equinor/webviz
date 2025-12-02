import React from "react";

import { Visibility, VisibilityOff } from "@mui/icons-material";
import { isEqual } from "lodash";

import { Button } from "@lib/components/Button";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
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
type ValueRangeType = [[number, number, number], [number, number, number], [number, number, number]];
export class SeismicSliceSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType) => {
            if (accumulator === null) {
                return valueRange;
            }

            const mergedRanges: ValueRangeType = [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            for (let i = 0; i < 3; i++) {
                const min = Math.max(accumulator[i][0], valueRange[i][0]);
                const max = Math.min(accumulator[i][1], valueRange[i][1]);
                const step = Math.max(accumulator[i][2], valueRange[i][2]);

                mergedRanges[i] = [min, max, step];
            }

            return mergedRanges;
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType): boolean => {
            const [xRange, yRange, zRange] = valueRange;
            return xRange[0] <= xRange[1] && yRange[0] <= yRange[1] && zRange[0] <= zRange[1];
        },
    };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        if (value === null) {
            return true;
        }

        if (typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const v = value as Record<string, unknown>;

        // Check 'value' property - must be [number, number, number]
        if (!Array.isArray(v.value) || v.value.length !== 3) {
            return false;
        }
        if (!v.value.every((item) => typeof item === "number")) {
            return false;
        }

        // Check 'visible' property - must be [boolean, boolean, boolean]
        if (!Array.isArray(v.visible) || v.visible.length !== 3) {
            return false;
        }
        if (!v.visible.every((item) => typeof item === "boolean")) {
            return false;
        }

        // Check 'applied' property - must be boolean
        if (typeof v.applied !== "boolean") {
            return false;
        }

        return true;
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        if (!currentValue || !Array.isArray(currentValue.value) || currentValue.value.length !== 3) {
            return {
                value: [valueRange[0][0], valueRange[1][0], valueRange[2][0]],
                visible: [true, true, true],
                applied: true,
            };
        }

        const fixedValue: [number, number, number] = currentValue.value.map((val, index) => {
            const [min, max, step] = valueRange[index];
            return Math.max(min, Math.min(max, Math.round(val / step) * step));
        }) as [number, number, number];

        return { value: fixedValue, visible: [true, true, true], applied: currentValue.applied };
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        if (!value || !Array.isArray(value.value) || value.value.length !== 3) {
            return false;
        }
        return value.value.every((val, index) => {
            const [min, max, step] = valueRange[index];
            return val >= min && val <= max && (val - min) % step === 0;
        });
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const valueRange = props.valueRange ?? [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

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

            function handleSliderChange(index: number, val: number) {
                const newValue: [number, number, number] = [...(internalValue ?? [0, 0, 0])];
                newValue[index] = val;
                setInternalValue(newValue);
                props.onValueChange({ value: newValue, visible, applied: false });
            }

            function handleInputChange(index: number, val: number) {
                const min = valueRange[index][0];
                const max = valueRange[index][1];
                const step = valueRange[index][2];
                const allowedValues = Array.from(
                    { length: Math.floor((max - min) / step) + 1 },
                    (_, i) => min + i * step,
                );
                const newVal = allowedValues.reduce((prev, curr) =>
                    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev,
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

            function handleApplyChanges() {
                if (internalValue) {
                    props.onValueChange({ value: internalValue, visible, applied: true });
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
                    <div className={resolveClassNames({ "outline-2 outline-amber-400": hasChanges })} ref={divRef}>
                        {labels.map((label, index) => (
                            <div key={`setting-${index}`} className="flex items-center gap-x-4">
                                <div className="w-8 flex flex-col items-start pl-1">{label}</div>
                                <div className="min-w-4">
                                    <DenseIconButton
                                        title="Toggle visibility"
                                        onClick={() => handleVisibleChange(index)}
                                    >
                                        {visible[index] ? (
                                            <Visibility fontSize="inherit" />
                                        ) : (
                                            <VisibilityOff fontSize="inherit" />
                                        )}
                                    </DenseIconButton>
                                </div>
                                <div className="flex-4">
                                    <Slider
                                        min={valueRange[index][0]}
                                        max={valueRange[index][1]}
                                        onChange={(_, value) => handleSliderChange(index, value as number)}
                                        value={props.value?.value[index] ?? valueRange[index][0]}
                                        valueLabelDisplay="auto"
                                        step={valueRange[index][2]}
                                        track={false}
                                    />
                                </div>
                                <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={internalValue?.[index] ?? 0}
                                        onChange={(e) => handleInputChange(index, parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-2">
                        <Button variant="contained" onClick={handleApplyChanges} disabled={!hasChanges}>
                            Apply Changes
                        </Button>
                    </div>
                </>
            );
        };
    }
}
