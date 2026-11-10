import React from "react";

import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import { FieldCompositions } from "@lib/components/Field/compositions";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["internalValue"] | null;
type ExternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["externalValue"] | null;
type ValueRangeType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["valueConstraints"] | null;

// Per-field validity, composed together by isValueValid() below - also used directly in the component
// to flag only the specific field that's actually wrong, instead of a single setting-wide flag applying
// to all three fields at once.
function isTopSurfaceValid(value: InternalValueType, valueConstraints: ValueRangeType): boolean {
    if (value === null || valueConstraints === null) {
        return true;
    }
    return value.topSurfaceName !== null && valueConstraints.surfaceNamesInStratOrder.includes(value.topSurfaceName);
}

function isBaseSurfaceValid(value: InternalValueType, valueConstraints: ValueRangeType): boolean {
    if (value === null || valueConstraints === null || value.baseSurfaceName === null) {
        return true;
    }
    if (!valueConstraints.surfaceNamesInStratOrder.includes(value.baseSurfaceName)) {
        return false;
    }
    if (value.topSurfaceName === null) {
        return true;
    }
    const topIndex = valueConstraints.surfaceNamesInStratOrder.indexOf(value.topSurfaceName);
    const bottomIndex = valueConstraints.surfaceNamesInStratOrder.indexOf(value.baseSurfaceName);
    return topIndex !== -1 && bottomIndex !== -1 && topIndex <= bottomIndex;
}

function isRealizationNumValid(value: InternalValueType, valueConstraints: ValueRangeType): boolean {
    if (value === null || valueConstraints === null) {
        return true;
    }
    return value.realizationNum !== null && valueConstraints.realizationNums.includes(value.realizationNum);
}

export class WellboreDepthFilterSetting implements CustomSettingImplementation<
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

            mergedValueRange.realizationNums = mergedValueRange.realizationNums.filter((num) =>
                valueConstraints.realizationNums.includes(num),
            );

            mergedValueRange.surfaceNamesInStratOrder = mergedValueRange.surfaceNamesInStratOrder.filter((name) =>
                valueConstraints.surfaceNamesInStratOrder.includes(name),
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

        // Check realizationNum is a number
        if (typeof v.realizationNum !== "number") {
            return false;
        }

        // Check topSurfaceName is string or null
        if (v.topSurfaceName !== null && typeof v.topSurfaceName !== "string") {
            return false;
        }

        // Check baseSurfaceName is string or null
        if (v.baseSurfaceName !== null && typeof v.baseSurfaceName !== "string") {
            return false;
        }

        return true;
    }

    mapInternalToExternalValue(internalValue: InternalValueType): ExternalValueType {
        return internalValue;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueRangeType): InternalValueType {
        if (valueConstraints === null) {
            return null;
        }

        if (valueConstraints.surfaceNamesInStratOrder.length === 0) {
            return null;
        }

        if (currentValue === null) {
            return {
                topSurfaceName: valueConstraints.surfaceNamesInStratOrder[0],
                baseSurfaceName: null,
                realizationNum: valueConstraints.realizationNums[0],
            };
        }
        const fixedValue = { ...currentValue };

        if (
            fixedValue.topSurfaceName === null ||
            !valueConstraints.surfaceNamesInStratOrder.includes(fixedValue.topSurfaceName)
        ) {
            fixedValue.topSurfaceName = valueConstraints.surfaceNamesInStratOrder[0];
        }

        if (
            fixedValue.baseSurfaceName !== null &&
            !valueConstraints.surfaceNamesInStratOrder.includes(fixedValue.baseSurfaceName)
        ) {
            fixedValue.baseSurfaceName = null;
        }

        if (!valueConstraints.realizationNums.includes(fixedValue.realizationNum)) {
            fixedValue.realizationNum = valueConstraints.realizationNums[0];
        }

        return fixedValue;
    }

    isValueValid(value: InternalValueType, valueConstraints: ValueRangeType): boolean {
        if (valueConstraints === null) {
            return false;
        }

        if (valueConstraints.surfaceNamesInStratOrder.length === 0) {
            return value === null;
        }

        if (value === null) {
            return false;
        }

        return (
            isTopSurfaceValid(value, valueConstraints) &&
            isBaseSurfaceValid(value, valueConstraints) &&
            isRealizationNumValid(value, valueConstraints)
        );
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

            const topSurfaceOptions = React.useMemo(
                () =>
                    props.valueConstraints
                        ? props.valueConstraints.surfaceNamesInStratOrder.map((name) => ({
                              value: name,
                              label: name,
                          }))
                        : [],
                [props.valueConstraints],
            );

            const baseSurfaceOptions = React.useMemo(
                () =>
                    props.valueConstraints
                        ? [
                              { value: null, label: "None" },
                              ...props.valueConstraints.surfaceNamesInStratOrder
                                  .filter((name) => name !== props.value?.topSurfaceName)
                                  .map((name) => ({
                                      value: name,
                                      label: name,
                                  })),
                          ]
                        : [],
                [props.valueConstraints, props.value?.topSurfaceName],
            );

            const realizationNumOptions = React.useMemo(
                () =>
                    props.valueConstraints
                        ? props.valueConstraints.realizationNums.map((num) => ({
                              value: num,
                              label: num.toString(),
                          }))
                        : [],
                [props.valueConstraints],
            );

            const handleTopSurfaceChange = React.useCallback(
                function handleTopSurfaceChange(newTopSurfaceName: string | null) {
                    onValueChange((prev) => ({
                        ...prev,
                        realizationNum: prev?.realizationNum ?? 0,
                        baseSurfaceName:
                            prev?.baseSurfaceName &&
                            newTopSurfaceName &&
                            props.valueConstraints &&
                            props.valueConstraints.surfaceNamesInStratOrder.indexOf(prev.baseSurfaceName) >
                                props.valueConstraints.surfaceNamesInStratOrder.indexOf(newTopSurfaceName)
                                ? prev.baseSurfaceName
                                : null,
                        topSurfaceName: newTopSurfaceName,
                    }));
                },
                [onValueChange, props.valueConstraints],
            );

            const handleBaseSurfaceChange = React.useCallback(
                function handleBaseSurfaceChange(newBaseSurfaceName: string | null) {
                    onValueChange((prev) => ({
                        ...prev,
                        realizationNum: prev?.realizationNum ?? 0,
                        baseSurfaceName: newBaseSurfaceName,
                        topSurfaceName: prev?.topSurfaceName ?? null,
                    }));
                },
                [onValueChange],
            );

            const handleRealizationNumChange = React.useCallback(
                function handleRealizationNumChange(newRealizationNum: number | null) {
                    onValueChange((prev) => ({
                        ...prev,
                        realizationNum: newRealizationNum ?? 0,
                        baseSurfaceName: prev?.baseSurfaceName ?? null,
                        topSurfaceName: prev?.topSurfaceName ?? null,
                    }));
                },
                [onValueChange],
            );

            return (
                <div className="gap-y-2xs text-body-sm flex w-full flex-col">
                    <FieldCompositions.Default
                        label="Top Surface"
                        invalid={!isTopSurfaceValid(props.value, props.valueConstraints)}
                    >
                        <ComboboxCompositions.WithBrowseButtons
                            items={topSurfaceOptions}
                            value={props.value?.topSurfaceName}
                            onValueChange={handleTopSurfaceChange}
                            disabled={props.disabled}
                        />
                    </FieldCompositions.Default>
                    <FieldCompositions.Default
                        label="Base Surface"
                        invalid={!isBaseSurfaceValid(props.value, props.valueConstraints)}
                    >
                        <ComboboxCompositions.WithBrowseButtons
                            items={baseSurfaceOptions}
                            value={props.value?.baseSurfaceName}
                            onValueChange={handleBaseSurfaceChange}
                            disabled={props.disabled}
                        />
                    </FieldCompositions.Default>
                    <FieldCompositions.Default
                        label="Realization Number"
                        invalid={!isRealizationNumValid(props.value, props.valueConstraints)}
                    >
                        <ComboboxCompositions.WithBrowseButtons
                            items={realizationNumOptions}
                            value={props.value?.realizationNum}
                            onValueChange={handleRealizationNumChange}
                            disabled={props.disabled}
                        />
                    </FieldCompositions.Default>
                </div>
            );
        };
    }
}
