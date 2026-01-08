import React from "react";

import { cloneDeep, isEqual } from "lodash";

import type { Grid3dZone_api } from "@api";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type InternalValueType = {
    i: [number, number];
    j: [number, number];
    k: { type: "range"; range: [number, number] } | { type: "zone"; range: [number, number]; name: string };
} | null;
type ExternalValueType = [[number, number], [number, number], [number, number]] | null;
type ValueConstraintsType = {
    range: { i: [number, number, number]; j: [number, number, number]; k: [number, number, number] };
    zones: Grid3dZone_api[];
} | null;

/**
 * Helper function to validate that an array is a number tuple of specific length
 */
function isNumberTuple(value: unknown, length: number): value is number[] {
    return Array.isArray(value) && value.length === length && value.every((v) => typeof v === "number");
}

export class GridLayerRangeSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueConstraintsType>
{
    defaultValue: InternalValueType = null;
    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueConstraintsType, valueConstraints: ValueConstraintsType, index: number) => {
            if (index === 0) {
                return valueConstraints;
            }

            if (valueConstraints === null || accumulator === null) {
                return null;
            }

            const mergedRanges: NonNullable<ValueConstraintsType>["range"] = {
                i: [0, 0, 1],
                j: [0, 0, 1],
                k: [0, 0, 1],
            };

            for (const key of ["i", "j", "k"] as const) {
                const min = Math.max(accumulator.range[key][0], valueConstraints?.range[key][0]);
                const max = Math.min(accumulator.range[key][1], valueConstraints?.range[key][1]);
                const step = Math.max(accumulator.range[key][2], valueConstraints?.range[key][2]);

                mergedRanges[key] = [min, max, step];
            }

            const mergedZones = accumulator.zones.filter((zoneA) =>
                valueConstraints.zones.some(
                    (zoneB) =>
                        zoneA.name === zoneB.name &&
                        zoneA.start_layer === zoneB.start_layer &&
                        zoneA.end_layer === zoneB.end_layer,
                ),
            );

            return { range: mergedRanges, zones: mergedZones };
        },
        startingValue: null,
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            if (valueConstraints === null) {
                return false;
            }
            const { i: iRange, j: jRange, k: kRange } = valueConstraints.range;
            return iRange[0] <= iRange[1] && jRange[0] <= jRange[1] && kRange[0] <= kRange[1];
        },
    };

    serializeValue(value: InternalValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): InternalValueType {
        const parsed = JSON.parse(serializedValue);

        // null is always valid
        if (parsed === null) {
            return null;
        }

        // Check if value is an object (not array, not null)
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;

        // Check 'i' property - must be [number, number]
        if (!isNumberTuple(v.i, 2)) {
            throw new Error("Expected 'i' to be array of 2 numbers");
        }

        // Check 'j' property - must be [number, number]
        if (!isNumberTuple(v.j, 2)) {
            throw new Error("Expected 'j' to be array of 2 numbers");
        }

        // Check 'k' property exists and is an object
        if (typeof v.k !== "object" || v.k === null || Array.isArray(v.k)) {
            throw new Error("Expected 'k' to be an object");
        }

        const k = v.k as Record<string, unknown>;

        // Check 'k.type' is either "range" or "zone"
        if (k.type !== "range" && k.type !== "zone") {
            throw new Error("Expected 'k.type' to be 'range' or 'zone'");
        }

        // Check 'k.range' is [number, number]
        if (!isNumberTuple(k.range, 2)) {
            throw new Error("Expected 'k.range' to be array of 2 numbers");
        }

        // For zone type, check 'k.name' is a string
        if (k.type === "zone" && typeof k.name !== "string") {
            throw new Error("Expected 'k.name' to be string for zone type");
        }

        return parsed as InternalValueType;
    }

    mapInternalToExternalValue(internalValue: InternalValueType): ExternalValueType {
        if (internalValue === null) {
            return null;
        }

        return [internalValue.i, internalValue.j, internalValue.k.range];
    }

    isValueValid(value: InternalValueType, valueConstraints: ValueConstraintsType): boolean {
        if (value === null || valueConstraints === null) {
            return false;
        }

        const { i: iRange, j: jRange, k: kRange } = valueConstraints.range;
        const [iMin, iMax] = value.i;
        const [jMin, jMax] = value.j;
        const [kMin, kMax] = value.k.range;
        const type = value.k.type;

        if (iMin < iRange[0] || iMax > iRange[1] || iMin > iMax) {
            return false;
        }
        if (jMin < jRange[0] || jMax > jRange[1] || jMin > jMax) {
            return false;
        }

        if (kMin < kRange[0] || kMax > kRange[1] || kMin > kMax) {
            return false;
        }

        if (type === "zone") {
            const zoneName = value.k.name;
            const zoneExists = valueConstraints.zones.some(
                (zone) => zone.name === zoneName && zone.start_layer === kMin && zone.end_layer === kMax,
            );
            if (!zoneExists) {
                return false;
            }
        }

        if (type !== "range" && type !== "zone") {
            throw new Error(`Unknown type: ${type}`);
        }

        return true;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueConstraintsType): InternalValueType {
        if (valueConstraints === null) {
            return null;
        }
        const { i: iRange, j: jRange, k: kRange } = valueConstraints.range;

        if (currentValue === null) {
            return {
                i: [iRange[0], iRange[1]],
                j: [jRange[0], jRange[1]],
                k: { type: "range", range: [kRange[0], kRange[1]] },
            };
        }

        const iMin = Math.min(currentValue.i[0], currentValue.i[1]);
        const iMax = Math.max(currentValue.i[0], currentValue.i[1]);
        const jMin = Math.min(currentValue.j[0], currentValue.j[1]);
        const jMax = Math.max(currentValue.j[0], currentValue.j[1]);
        const kMin = Math.min(currentValue.k.range[0], currentValue.k.range[1]);
        const kMax = Math.max(currentValue.k.range[0], currentValue.k.range[1]);

        const newIRange: [number, number] = [Math.max(iRange[0], iMin), Math.min(iRange[1], iMax)];
        const newJRange: [number, number] = [Math.max(jRange[0], jMin), Math.min(jRange[1], jMax)];
        const newKRange: [number, number] = [Math.max(kRange[0], kMin), Math.min(kRange[1], kMax)];

        const type = currentValue.k.type;

        if (type === "range") {
            return {
                i: newIRange,
                j: newJRange,
                k: { type: "range", range: newKRange },
            };
        }

        if (type === "zone") {
            const zoneName = currentValue.k.name;
            const zoneExists = valueConstraints.zones.some(
                (zone) => zone.name === zoneName && zone.start_layer === kMin && zone.end_layer === kMax,
            );
            if (zoneExists) {
                return { i: newIRange, j: newJRange, k: { type: "zone", range: [kMin, kMax], name: zoneName } };
            } else {
                return {
                    i: newIRange,
                    j: newJRange,
                    k: { type: "range", range: newKRange },
                };
            }
        }

        throw new Error(`Unknown type: ${type}`);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueConstraintsType>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<InternalValueType, ValueConstraintsType>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const valueConstraints: NonNullable<ValueConstraintsType> = props.valueConstraints ?? {
                range: { i: [0, 0, 1], j: [0, 0, 1], k: [0, 0, 1] },
                zones: [],
            };

            const [internalValue, setInternalValue] = React.useState<InternalValueType | null>(cloneDeep(props.value));
            const [prevValue, setPrevValue] = React.useState<InternalValueType>(cloneDeep(props.value));

            if (!isEqual(props.value, prevValue)) {
                setInternalValue(cloneDeep(props.value));
                setPrevValue(cloneDeep(props.value));
            }

            function handleSliderChange(key: keyof NonNullable<InternalValueType>, val: number[]) {
                const newValue: InternalValueType = {
                    ...(internalValue ?? { i: [0, 0], j: [0, 0], k: { type: "range", range: [0, 0] } }),
                };
                if (key === "k") {
                    newValue.k = { type: "range", range: [val[0], val[1]] };
                } else {
                    newValue[key] = val as [number, number];
                }
                setInternalValue(newValue);
            }

            function handleInputChange(key: keyof NonNullable<InternalValueType>, innerIndex: number, val: number) {
                const min = valueConstraints.range[key][0];
                const max = valueConstraints.range[key][1];
                const step = valueConstraints.range[key][2];
                const allowedValues = Array.from(
                    { length: Math.floor((max - min) / step) + 1 },
                    (_, i) => min + i * step,
                );
                const newVal = allowedValues.reduce((prev, curr) =>
                    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev,
                );

                const newValue: InternalValueType = {
                    ...(internalValue ?? { i: [0, 0], j: [0, 0], k: { type: "range", range: [0, 0] } }),
                };
                if (key === "k") {
                    newValue.k = { type: "range", range: newValue.k.range };
                    newValue.k.range[innerIndex] = newVal;
                } else {
                    newValue[key][innerIndex] = newVal;
                }
                setInternalValue(newValue);
            }

            const labels: (keyof Omit<NonNullable<InternalValueType>, "k">)[] = ["i", "j"];
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

            // @ts-expect-error unused argument
            function handleRadioChange(_, newType: "range" | "zone") {
                const newValue: InternalValueType = {
                    ...(internalValue ?? { i: [0, 0], j: [0, 0], k: { type: "range", range: [0, 0] } }),
                };
                if (newType === "range") {
                    newValue.k = { type: "range", range: newValue.k.range };
                } else if (newType === "zone") {
                    // Default to first zone if available
                    if (valueConstraints.zones.length > 0) {
                        const zone = valueConstraints.zones[0];
                        newValue.k = { type: "zone", range: [zone.start_layer, zone.end_layer], name: zone.name };
                    } else {
                        // No zones available, fallback to range
                        newValue.k = { type: "range", range: newValue.k.range };
                    }
                }
                setInternalValue(newValue);
            }

            return (
                <>
                    <div
                        className={resolveClassNames("flex flex-col gap-y-2", {
                            "outline-2 outline-amber-400": hasChanges,
                        })}
                        ref={divRef}
                    >
                        {labels.map((label) => (
                            <div key={`setting-${label}`} className="flex items-center gap-x-1">
                                <div className="w-8 flex flex-col items-start pl-1">{label.toUpperCase()}</div>
                                <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={internalValue?.[label][0] ?? valueConstraints.range[label][0]}
                                        onChange={(e) => handleInputChange(label, 0, parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="grow">
                                    <Slider
                                        min={valueConstraints.range[label][0]}
                                        max={valueConstraints.range[label][1]}
                                        onChange={(_, value) => handleSliderChange(label, value as [number, number])}
                                        value={
                                            internalValue?.[label] ?? [
                                                valueConstraints.range[label][0],
                                                valueConstraints.range[label][1],
                                            ]
                                        }
                                        valueLabelDisplay="auto"
                                        step={valueConstraints.range[label][2]}
                                    />
                                </div>
                                <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                    <Input
                                        type="number"
                                        value={internalValue?.[label][1] ?? valueConstraints.range[label][1]}
                                        onChange={(e) => handleInputChange(label, 1, parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-x-1">
                            <div className="w-8 flex flex-col items-start pl-1">K</div>
                            <div>
                                <RadioGroup
                                    value={internalValue?.["k"].type ?? "range"}
                                    options={[
                                        { label: "Range", value: "range" },
                                        { label: "Zone", value: "zone", disabled: valueConstraints.zones.length === 0 },
                                    ]}
                                    onChange={handleRadioChange}
                                    direction="horizontal"
                                />
                            </div>
                        </div>
                        <div
                            className={resolveClassNames("flex items-center gap-x-1 pl-8 h-8", {
                                hidden: internalValue?.["k"].type !== "range" && internalValue !== null,
                            })}
                        >
                            <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                <Input
                                    type="number"
                                    value={internalValue?.["k"].range[0] ?? valueConstraints.range["k"][0]}
                                    onChange={(e) => handleInputChange("k", 0, parseInt(e.target.value))}
                                />
                            </div>
                            <div className="grow">
                                <Slider
                                    min={valueConstraints.range["k"][0]}
                                    max={valueConstraints.range["k"][1]}
                                    onChange={(_, value) => handleSliderChange("k", value as [number, number])}
                                    value={
                                        internalValue?.["k"].range ?? [
                                            valueConstraints.range["k"][0],
                                            valueConstraints.range["k"][1],
                                        ]
                                    }
                                    valueLabelDisplay="auto"
                                    step={valueConstraints.range["k"][2]}
                                />
                            </div>
                            <div className={resolveClassNames("w-1/5", { hidden: !inputsVisible })}>
                                <Input
                                    type="number"
                                    value={internalValue?.["k"].range[1] ?? valueConstraints.range["k"][1]}
                                    onChange={(e) => handleInputChange("k", 1, parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                        <div
                            className={resolveClassNames("flex items-center gap-x-1 pl-8 h-8", {
                                hidden: internalValue?.["k"].type !== "zone",
                            })}
                        >
                            <Dropdown
                                options={valueConstraints.zones.map((zone) => ({
                                    label: zone.name,
                                    value: zone.name,
                                }))}
                                value={internalValue?.["k"].type === "zone" ? internalValue.k.name : undefined}
                                onChange={(val) => {
                                    const zone = valueConstraints.zones.find((z) => z.name === val);
                                    if (zone) {
                                        const newValue: InternalValueType = {
                                            ...(internalValue ?? {
                                                i: [0, 0],
                                                j: [0, 0],
                                                k: { type: "range", range: [0, 0] },
                                            }),
                                            k: {
                                                type: "zone",
                                                range: [zone.start_layer, zone.end_layer],
                                                name: zone.name,
                                            },
                                        };
                                        setInternalValue(newValue);
                                    }
                                }}
                            />
                        </div>
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
