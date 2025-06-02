import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";
import { isEqual } from "lodash";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button } from "@lib/components/Button";

type ValueType = [[number, number], [number, number], [number, number]] | null;
type Category = SettingCategory.XYZ_RANGE;

export class GridLayerRangeSetting implements CustomSettingImplementation<ValueType, Category> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Grid ranges";
    }

    makeComponent(): (props: SettingComponentProps<ValueType, Category>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, Category>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const availableValues = props.availableValues ?? [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            const [internalValue, setInternalValue] = React.useState<
                [[number, number], [number, number], [number, number]] | null
            >(props.value);

            function handleSliderChange(index: number, val: number[]) {
                const newValue: [[number, number], [number, number], [number, number]] = [
                    ...(internalValue ?? [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                    ]),
                ];
                newValue[index] = val as [number, number];
                setInternalValue(newValue);
            }

            function handleInputChange(outerIndex: number, innerIndex: number, val: number) {
                const min = availableValues[outerIndex][0];
                const max = availableValues[outerIndex][1];
                const step = availableValues[outerIndex][2];
                const allowedValues = Array.from(
                    { length: Math.floor((max - min) / step) + 1 },
                    (_, i) => min + i * step,
                );
                const newVal = allowedValues.reduce((prev, curr) =>
                    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev,
                );

                const newValue: [[number, number], [number, number], [number, number]] = [
                    ...(internalValue ?? [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                    ]),
                ];
                newValue[outerIndex][innerIndex] = newVal;
                setInternalValue(newValue);
            }

            const labels: string[] = ["I", "J", "K"];
            const hasChanges = !isEqual(internalValue, props.value);
            const MIN_SIZE = 250;
            let inputsVisible = true;
            if (divSize.width < MIN_SIZE) {
                inputsVisible = false;
            }

            function handleApplyChanges() {
                if (internalValue && !isEqual(internalValue, props.value)) {
                    props.onValueChange(internalValue);
                }
            }

            return (
                <>
                    <div className={resolveClassNames({ "outline-2 outline-amber-400": hasChanges })} ref={divRef}>
                        {labels.map((label, index) => (
                            <div key={`setting-${index}`} className="flex items-center gap-x-1">
                                <div className="w-8 flex flex-col items-start pl-1">{label}</div>
                                <div className="w-1/5">
                                    <Input
                                        type="number"
                                        value={props.value?.[index][0] ?? 0}
                                        onChange={(e) => handleInputChange(index, 0, parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="grow">
                                    <Slider
                                        min={availableValues[index][0]}
                                        max={availableValues[index][1]}
                                        onChange={(_, value) => handleSliderChange(index, value as [number, number])}
                                        value={
                                            props.value?.[index] ?? [
                                                availableValues[index][0],
                                                availableValues[index][1],
                                            ]
                                        }
                                        valueLabelDisplay="auto"
                                        step={availableValues[index][2]}
                                    />
                                </div>
                                <div className="w-1/5">
                                    <Input
                                        type="number"
                                        value={props.value?.[index][1] ?? 0}
                                        onChange={(e) => handleInputChange(index, 1, parseInt(e.target.value))}
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
