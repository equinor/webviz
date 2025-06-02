import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";
import { useElementSize } from "@lib/hooks/useElementSize";
import { isEqual } from "lodash";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button } from "@lib/components/Button";

type ValueType = [number, number, number] | null;
type Category = SettingCategory.XYZ_NUMBER;
export class SeismicSliceSetting implements CustomSettingImplementation<ValueType, Category> {
    makeComponent(): (props: SettingComponentProps<ValueType, Category>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, Category>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const availableValues = props.availableValues ?? [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            const [internalValue, setInternalValue] = React.useState<[number, number, number] | null>(props.value);

            function handleSliderChange(index: number, val: number) {
                const newValue: [number, number, number] = [...(internalValue ?? [0, 0, 0])];
                newValue[index] = val;
                setInternalValue(newValue);
            }

            function handleInputChange(index: number, val: number) {
                const min = availableValues[index][0];
                const max = availableValues[index][1];
                const step = availableValues[index][2];
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
            }

            function handleApplyChanges() {
                if (internalValue && !isEqual(internalValue, props.value)) {
                    props.onValueChange(internalValue);
                }
            }

            const labels: string[] = ["Col", "Row", "Depth"];
            const hasChanges = !isEqual(internalValue, props.value);
            const MIN_SIZE = 250;
            let inputsVisible = true;
            if (divSize.width < MIN_SIZE) {
                inputsVisible = false;
            }

            return (
                <>
                    <div className={resolveClassNames({ "outline-2 outline-amber-400": hasChanges })} ref={divRef}>
                        {labels.map((label, index) => (
                            <div key={`setting-${index}`} className="flex items-center gap-x-1">
                                <div className="w-8 flex flex-col items-start pl-1">{label}</div>
                                <div className="flex-4">
                                    <Slider
                                        min={availableValues[index][0]}
                                        max={availableValues[index][1]}
                                        onChange={(_, value) => handleSliderChange(index, value as number)}
                                        value={props.value?.[index] ?? availableValues[index][0]}
                                        valueLabelDisplay="auto"
                                        step={availableValues[index][2]}
                                        track={false}
                                    />
                                </div>
                                <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={props.value?.[index] ?? 0}
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
