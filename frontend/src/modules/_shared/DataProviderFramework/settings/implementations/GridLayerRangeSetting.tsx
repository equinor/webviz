import React from "react";

import { cloneDeep, isEqual } from "lodash-es";

import type { Grid3dZone_api } from "@api";
import { Button } from "@lib/components/Button";
import { Combobox } from "@lib/components/Combobox";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { Slider } from "@lib/components/Slider";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type InternalValueType = {
    i: [number | "min", number | "max"];
    j: [number | "min", number | "max"];
    k:
        | { type: "range"; range: [number | "min", number | "max"] }
        | { type: "zone"; range: [number, number]; name: string };
} | null;
type ExternalValueType = [[number, number], [number, number], [number, number]] | null;
type ValueConstraintsType = {
    range: { i: [number, number, number]; j: [number, number, number]; k: [number, number, number] };
    zones: Grid3dZone_api[];
} | null;

function isNumberTuple(value: unknown, length: number): value is number[] {
    return Array.isArray(value) && value.length === length && value.every((v) => typeof v === "number");
}

function isRangeTuple(value: unknown): value is [number | "min", number | "max"] {
    if (!Array.isArray(value) || value.length !== 2) return false;
    const [first, second] = value;
    return (first === "min" || typeof first === "number") && (second === "max" || typeof second === "number");
}

export class GridLayerRangeSetting implements CustomSettingImplementation<
    InternalValueType,
    ExternalValueType,
    ValueConstraintsType
> {
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

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;

        if (!isRangeTuple(v.i)) {
            throw new Error("Expected 'i' to be [number|'min', number|'max']");
        }

        if (!isRangeTuple(v.j)) {
            throw new Error("Expected 'j' to be [number|'min', number|'max']");
        }

        if (typeof v.k !== "object" || v.k === null || Array.isArray(v.k)) {
            throw new Error("Expected 'k' to be an object");
        }

        const k = v.k as Record<string, unknown>;

        if (k.type !== "range" && k.type !== "zone") {
            throw new Error("Expected 'k.type' to be 'range' or 'zone'");
        }

        if (k.type === "range") {
            if (!isRangeTuple(k.range)) {
                throw new Error("Expected 'k.range' to be [number|'min', number|'max'] for range type");
            }
        } else {
            if (!isNumberTuple(k.range, 2)) {
                throw new Error("Expected 'k.range' to be array of 2 numbers for zone type");
            }
            if (typeof k.name !== "string") {
                throw new Error("Expected 'k.name' to be string for zone type");
            }
        }

        return parsed as InternalValueType;
    }

    mapInternalToExternalValue(
        internalValue: InternalValueType,
        valueConstraints: ValueConstraintsType,
    ): ExternalValueType {
        if (internalValue === null) {
            return null;
        }

        const externalValueI: [number, number] = [
            internalValue.i[0] === "min" ? (valueConstraints?.range.i[0] ?? 0) : internalValue.i[0],
            internalValue.i[1] === "max" ? (valueConstraints?.range.i[1] ?? 0) : internalValue.i[1],
        ];

        const externalValueJ: [number, number] = [
            internalValue.j[0] === "min" ? (valueConstraints?.range.j[0] ?? 0) : internalValue.j[0],
            internalValue.j[1] === "max" ? (valueConstraints?.range.j[1] ?? 0) : internalValue.j[1],
        ];

        const externalValueK: [number, number] = [
            internalValue.k.range[0] === "min" ? (valueConstraints?.range.k[0] ?? 0) : internalValue.k.range[0],
            internalValue.k.range[1] === "max" ? (valueConstraints?.range.k[1] ?? 0) : internalValue.k.range[1],
        ];

        return [externalValueI, externalValueJ, externalValueK];
    }

    isValueValid(value: InternalValueType, valueConstraints: ValueConstraintsType): boolean {
        if (value === null || valueConstraints === null) {
            return false;
        }

        const { i: iRange, j: jRange, k: kRange } = valueConstraints.range;

        const iMin = value.i[0] === "min" ? iRange[0] : value.i[0];
        const iMax = value.i[1] === "max" ? iRange[1] : value.i[1];
        const jMin = value.j[0] === "min" ? jRange[0] : value.j[0];
        const jMax = value.j[1] === "max" ? jRange[1] : value.j[1];
        const kMin = value.k.range[0] === "min" ? kRange[0] : value.k.range[0];
        const kMax = value.k.range[1] === "max" ? kRange[1] : value.k.range[1];
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
                i: ["min", "max"],
                j: ["min", "max"],
                k: { type: "range", range: ["min", "max"] },
            };
        }

        // Resolve sentinels to numbers for arithmetic
        const rawI0 = currentValue.i[0] === "min" ? iRange[0] : currentValue.i[0];
        const rawI1 = currentValue.i[1] === "max" ? iRange[1] : currentValue.i[1];
        const rawJ0 = currentValue.j[0] === "min" ? jRange[0] : currentValue.j[0];
        const rawJ1 = currentValue.j[1] === "max" ? jRange[1] : currentValue.j[1];
        const rawK0 = currentValue.k.range[0] === "min" ? kRange[0] : currentValue.k.range[0];
        const rawK1 = currentValue.k.range[1] === "max" ? kRange[1] : currentValue.k.range[1];

        const iMin = Math.min(rawI0, rawI1);
        const iMax = Math.max(rawI0, rawI1);
        const jMin = Math.min(rawJ0, rawJ1);
        const jMax = Math.max(rawJ0, rawJ1);
        const kMin = Math.min(rawK0, rawK1);
        const kMax = Math.max(rawK0, rawK1);

        // Clamp to constraint range, preserving sentinels
        const newI0: number | "min" = currentValue.i[0] === "min" ? "min" : Math.max(iRange[0], iMin);
        const newI1: number | "max" = currentValue.i[1] === "max" ? "max" : Math.min(iRange[1], iMax);
        const newJ0: number | "min" = currentValue.j[0] === "min" ? "min" : Math.max(jRange[0], jMin);
        const newJ1: number | "max" = currentValue.j[1] === "max" ? "max" : Math.min(jRange[1], jMax);
        const newK0: number | "min" = currentValue.k.range[0] === "min" ? "min" : Math.max(kRange[0], kMin);
        const newK1: number | "max" = currentValue.k.range[1] === "max" ? "max" : Math.min(kRange[1], kMax);

        const type = currentValue.k.type;

        if (type === "range") {
            return {
                i: [newI0, newI1],
                j: [newJ0, newJ1],
                k: { type: "range", range: [newK0, newK1] },
            };
        }

        if (type === "zone") {
            const zoneName = currentValue.k.name;
            const zoneExists = valueConstraints.zones.some(
                (zone) => zone.name === zoneName && zone.start_layer === kMin && zone.end_layer === kMax,
            );
            if (zoneExists) {
                return {
                    i: [newI0, newI1],
                    j: [newJ0, newJ1],
                    k: { type: "zone", range: [kMin, kMax], name: zoneName },
                };
            } else {
                return {
                    i: [newI0, newI1],
                    j: [newJ0, newJ1],
                    k: { type: "range", range: [newK0, newK1] },
                };
            }
        }

        throw new Error(`Unknown type: ${type}`);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueConstraintsType>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<InternalValueType, ValueConstraintsType>) {
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

            const defaultBase: NonNullable<InternalValueType> = {
                i: ["min", "max"],
                j: ["min", "max"],
                k: { type: "range", range: ["min", "max"] },
            };

            function handleSliderChange(key: keyof NonNullable<InternalValueType>, val: number[], reason: string) {
                // Lock callbacks handle sentinel updates when locking; skip to avoid overwriting them
                if (reason === "range-locked") return;

                const base = internalValue ?? defaultBase;

                // Preserve a sentinel when:
                // - the constraint changed (clamp-value): keep all existing sentinels
                // - the value for that position didn't move (still at the constraint boundary):
                //   the other thumb was dragged, so this position should stay locked
                function keepSentinel(current: number | "min" | "max", newVal: number, constraintVal: number): boolean {
                    if (current !== "min" && current !== "max") return false;
                    return reason === "clamp-value" || newVal === constraintVal;
                }

                if (key === "k") {
                    if (base.k.type !== "range") return;
                    const prevRange = base.k.range;
                    setInternalValue({
                        ...base,
                        k: {
                            type: "range",
                            range: [
                                keepSentinel(prevRange[0], val[0], valueConstraints.range.k[0]) ? prevRange[0] : val[0],
                                keepSentinel(prevRange[1], val[1], valueConstraints.range.k[1]) ? prevRange[1] : val[1],
                            ],
                        },
                    });
                } else {
                    const prevRange = base[key];
                    const newRange: [number | "min", number | "max"] = [
                        keepSentinel(prevRange[0], val[0], valueConstraints.range[key][0]) ? prevRange[0] : val[0],
                        keepSentinel(prevRange[1], val[1], valueConstraints.range[key][1]) ? prevRange[1] : val[1],
                    ];
                    if (key === "i") setInternalValue({ ...base, i: newRange });
                    else setInternalValue({ ...base, j: newRange });
                }
            }

            function handleLockChange(key: "i" | "j" | "k", index: 0 | 1, locked: boolean) {
                const base = internalValue ?? defaultBase;

                if (key === "k") {
                    if (base.k.type !== "range") return;
                    const range: [number | "min", number | "max"] = [...base.k.range];
                    if (index === 0) {
                        if (locked) range[0] = "min";
                        else if (range[0] === "min") range[0] = valueConstraints.range.k[0];
                        else return; // already a number — a drag already updated the value, skip
                    } else {
                        if (locked) range[1] = "max";
                        else if (range[1] === "max") range[1] = valueConstraints.range.k[1];
                        else return;
                    }
                    setInternalValue({ ...base, k: { type: "range", range } });
                    return;
                }

                const range: [number | "min", number | "max"] = [...base[key]];
                if (index === 0) {
                    if (locked) range[0] = "min";
                    else if (range[0] === "min") range[0] = valueConstraints.range[key][0];
                    else return;
                } else {
                    if (locked) range[1] = "max";
                    else if (range[1] === "max") range[1] = valueConstraints.range[key][1];
                    else return;
                }
                if (key === "i") setInternalValue({ ...base, i: range });
                else setInternalValue({ ...base, j: range });
            }

            const labels: (keyof Omit<NonNullable<InternalValueType>, "k">)[] = ["i", "j"];
            const hasChanges = !isEqual(internalValue, props.value);

            function handleApplyChanges() {
                if (internalValue && !isEqual(internalValue, props.value)) {
                    props.onValueChange(internalValue);
                }
            }

            function handleRadioChange(newType: "range" | "zone") {
                const base = internalValue ?? defaultBase;
                if (newType === "range") {
                    setInternalValue({
                        ...base,
                        k: { type: "range", range: base.k.range as [number | "min", number | "max"] },
                    });
                } else if (newType === "zone") {
                    if (valueConstraints.zones.length > 0) {
                        const zone = valueConstraints.zones[0];
                        setInternalValue({
                            ...base,
                            k: { type: "zone", range: [zone.start_layer, zone.end_layer], name: zone.name },
                        });
                    } else {
                        setInternalValue({
                            ...base,
                            k: { type: "range", range: base.k.range as [number | "min", number | "max"] },
                        });
                    }
                }
            }

            function handleZoneChange(zoneName: string | null) {
                const zone = valueConstraints.zones.find((z) => z.name === zoneName);
                if (zone) {
                    const base = internalValue ?? defaultBase;
                    setInternalValue({
                        ...base,
                        k: {
                            type: "zone",
                            range: [zone.start_layer, zone.end_layer],
                            name: zone.name,
                        },
                    });
                }
            }

            return (
                <>
                    <div
                        className={resolveClassNames(
                            "gap-x-3xs gap-y-2xs p-4xs grid grid-cols-[auto_1fr] items-center",
                            {
                                "outline-accent-strong rounded outline-2": hasChanges,
                            },
                        )}
                    >
                        {labels.map((label) => (
                            <React.Fragment key={`setting-${label}`}>
                                <div className="pl-3xs w-8">{label.toUpperCase()}</div>
                                <div className="gap-x-3xs">
                                    <Slider
                                        min={valueConstraints.range[label][0]}
                                        max={valueConstraints.range[label][1]}
                                        onValueChange={(value, eventDetails) =>
                                            handleSliderChange(label, value as [number, number], eventDetails.reason)
                                        }
                                        value={
                                            internalValue
                                                ? [
                                                      internalValue[label][0] === "min"
                                                          ? valueConstraints.range[label][0]
                                                          : internalValue[label][0],
                                                      internalValue[label][1] === "max"
                                                          ? valueConstraints.range[label][1]
                                                          : internalValue[label][1],
                                                  ]
                                                : [valueConstraints.range[label][0], valueConstraints.range[label][1]]
                                        }
                                        valueLabelDisplay="always"
                                        valueLabelSide="bottom"
                                        step={valueConstraints.range[label][2]}
                                        // showRangeLocks
                                        minLocked={internalValue?.[label][0] === "min"}
                                        maxLocked={internalValue?.[label][1] === "max"}
                                        onMinLockedChange={(locked) => handleLockChange(label, 0, locked)}
                                        onMaxLockedChange={(locked) => handleLockChange(label, 1, locked)}
                                        disabled={props.disabled}
                                        markerLabels
                                    />
                                </div>
                            </React.Fragment>
                        ))}
                        <div className="pl-3xs row-span-2 w-8 self-center">K</div>
                        <div>
                            <RadioCompositions.GroupWithLabels
                                value={internalValue?.["k"].type ?? "range"}
                                options={[
                                    { label: "Range", value: "range" },
                                    { label: "Zone", value: "zone", disabled: valueConstraints.zones.length === 0 },
                                ]}
                                onValueChange={handleRadioChange}
                                layout="horizontal"
                                size="small"
                                disabled={props.disabled}
                            />
                        </div>
                        {internalValue?.k.type !== "zone" ? (
                            <Slider
                                min={valueConstraints.range["k"][0]}
                                max={valueConstraints.range["k"][1]}
                                onValueChange={(value, eventDetails) =>
                                    handleSliderChange("k", value as [number, number], eventDetails.reason)
                                }
                                value={
                                    internalValue?.k.type === "range"
                                        ? [
                                              internalValue.k.range[0] === "min"
                                                  ? valueConstraints.range.k[0]
                                                  : internalValue.k.range[0],
                                              internalValue.k.range[1] === "max"
                                                  ? valueConstraints.range.k[1]
                                                  : internalValue.k.range[1],
                                          ]
                                        : [valueConstraints.range["k"][0], valueConstraints.range["k"][1]]
                                }
                                valueLabelDisplay="always"
                                valueLabelSide="bottom"
                                step={valueConstraints.range["k"][2]}
                                showRangeLocks
                                minLocked={internalValue?.k.type === "range" && internalValue.k.range[0] === "min"}
                                maxLocked={internalValue?.k.type === "range" && internalValue.k.range[1] === "max"}
                                onMinLockedChange={(locked) => handleLockChange("k", 0, locked)}
                                onMaxLockedChange={(locked) => handleLockChange("k", 1, locked)}
                                disabled={props.disabled}
                                markerLabels
                            />
                        ) : (
                            <Combobox
                                items={valueConstraints.zones.map((zone) => ({
                                    label: zone.name,
                                    value: zone.name,
                                }))}
                                disabled={props.disabled}
                                value={internalValue?.["k"].type === "zone" ? internalValue.k.name : undefined}
                                onValueChange={handleZoneChange}
                            />
                        )}
                    </div>
                    <div className="mt-2xs flex justify-end">
                        <Button variant="contained" onClick={handleApplyChanges} disabled={!hasChanges} size="small">
                            Apply Changes
                        </Button>
                    </div>
                </>
            );
        };
    }
}
