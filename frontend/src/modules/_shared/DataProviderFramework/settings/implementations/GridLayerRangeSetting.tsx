import React from "react";

import { cloneDeep, isEqual } from "lodash";

import { Button } from "@lib/components/Button";
import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Grid3dZone_api } from "@api";

type InternalValueType =
    | [
          [number, number],
          [number, number],
          { type: "range"; range: [number, number] } | { type: "zone"; range: [number, number]; name: string },
      ]
    | null;
type ExternalValueType = [[number, number], [number, number], [number, number]] | null;
type ValueRangeType = {
    range: [[number, number, number], [number, number, number], [number, number, number]];
    zones: Grid3dZone_api[];
};

export class GridLayerRangeSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    defaultValue: InternalValueType = null;
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType) => {
            if (accumulator === null) {
                return valueRange;
            }

            const mergedRanges: ValueRangeType["range"] = [
                [0, 0, 1],
                [0, 0, 1],
                [0, 0, 1],
            ];

            for (let i = 0; i < 3; i++) {
                const min = Math.max(accumulator.range[i][0], valueRange.range[i][0]);
                const max = Math.min(accumulator.range[i][1], valueRange.range[i][1]);
                const step = Math.max(accumulator.range[i][2], valueRange.range[i][2]);

                mergedRanges[i] = [min, max, step];
            }

            const mergedZones = accumulator.zones.filter((zoneA) =>
                valueRange.zones.some(
                    (zoneB) =>
                        zoneA.name === zoneB.name &&
                        zoneA.start_layer === zoneB.start_layer &&
                        zoneA.end_layer === zoneB.end_layer,
                ),
            );

            return { range: mergedRanges, zones: mergedZones };
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType): boolean => {
            const [xRange, yRange, zRange] = valueRange.range;
            return xRange[0] <= xRange[1] && yRange[0] <= yRange[1] && zRange[0] <= zRange[1];
        },
    };

    isValueValid(value: InternalValueType, valueRange: ValueRangeType): boolean {
        if (value === null) {
            return false;
        }

        const [xRange, yRange, zRange] = valueRange.range;
        const [xmin, xmax] = value[0];
        const [ymin, ymax] = value[1];
        const [zmin, zmax] = value[2].range;

        return (
            xmin >= xRange[0] &&
            xmin <= xRange[1] &&
            xmax >= xRange[0] &&
            xmax <= xRange[1] &&
            ymin >= yRange[0] &&
            ymin <= yRange[1] &&
            ymax >= yRange[0] &&
            ymax <= yRange[1] &&
            zmin >= zRange[0] &&
            zmin <= zRange[1] &&
            zmax >= zRange[0] &&
            zmax <= zRange[1]
        );
    }

    fixupValue(currentValue: InternalValueType, valueRange: ValueRangeType): InternalValueType {
        const [xRange, yRange, zRange] = valueRange.range;

        if (currentValue === null) {
            return [
                [xRange[0], xRange[1]],
                [yRange[0], yRange[1]],
                [zRange[0], zRange[1]],
            ];
        }

        const [xmin, xmax] = currentValue[0];
        const [ymin, ymax] = currentValue[1];
        const [zmin, zmax] = currentValue[2];

        return [
            [Math.max(xRange[0], xmin), Math.min(xRange[1], xmax)],
            [Math.max(yRange[0], ymin), Math.min(yRange[1], ymax)],
            [Math.max(zRange[0], zmin), Math.min(zRange[1], zmax)],
        ];
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

            const [internalValue, setInternalValue] = React.useState<
                [[number, number], [number, number], [number, number]] | null
            >(cloneDeep(props.value));
            const [prevValue, setPrevValue] = React.useState<ValueType>(cloneDeep(props.value));

            if (!isEqual(props.value, prevValue)) {
                setInternalValue(cloneDeep(props.value));
                setPrevValue(cloneDeep(props.value));
            }

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
                const min = valueRange[outerIndex][0];
                const max = valueRange[outerIndex][1];
                const step = valueRange[outerIndex][2];
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
                                <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={internalValue?.[index][0] ?? 0}
                                        onChange={(e) => handleInputChange(index, 0, parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="grow">
                                    <Slider
                                        min={valueRange[index][0]}
                                        max={valueRange[index][1]}
                                        onChange={(_, value) => handleSliderChange(index, value as [number, number])}
                                        value={internalValue?.[index] ?? [valueRange[index][0], valueRange[index][1]]}
                                        valueLabelDisplay="auto"
                                        step={valueRange[index][2]}
                                    />
                                </div>
                                <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={internalValue?.[index][1] ?? 0}
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
