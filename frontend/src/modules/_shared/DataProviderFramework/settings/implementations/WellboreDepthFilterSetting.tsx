import React from "react";

import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["internalValue"] | null;
type ExternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["externalValue"] | null;
type ValueRangeType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["valueRange"] | null;

export class WellboreDepthFilterSetting
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

            mergedValueRange.realizationNums = mergedValueRange.realizationNums.filter((num) =>
                valueRange.realizationNums.includes(num),
            );

            mergedValueRange.surfaceNamesInStratOrder = mergedValueRange.surfaceNamesInStratOrder.filter((name) =>
                valueRange.surfaceNamesInStratOrder.includes(name),
            );

            return mergedValueRange;
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType) => {
            return valueRange !== null;
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

    fixupValue(currentValue: InternalValueType, valueRange: ValueRangeType): InternalValueType {
        if (valueRange === null) {
            return null;
        }

        if (currentValue === null) {
            return {
                topSurfaceName: valueRange.surfaceNamesInStratOrder[0],
                baseSurfaceName: null,
                realizationNum: valueRange.realizationNums[0],
            };
        }
        const fixedValue = { ...currentValue };

        if (
            fixedValue.topSurfaceName === null ||
            !valueRange.surfaceNamesInStratOrder.includes(fixedValue.topSurfaceName)
        ) {
            fixedValue.topSurfaceName = valueRange.surfaceNamesInStratOrder[0];
        }

        if (
            fixedValue.baseSurfaceName !== null &&
            !valueRange.surfaceNamesInStratOrder.includes(fixedValue.baseSurfaceName)
        ) {
            fixedValue.baseSurfaceName = null;
        }

        if (!valueRange.realizationNums.includes(fixedValue.realizationNum)) {
            fixedValue.realizationNum = valueRange.realizationNums[0];
        }

        return fixedValue;
    }

    isValueValid(value: InternalValueType, valueRange: ValueRangeType): boolean {
        if (value === null || valueRange === null) {
            return false;
        }

        if (value.topSurfaceName === null || value.realizationNum === null) {
            return false;
        }

        if (!valueRange.surfaceNamesInStratOrder.includes(value.topSurfaceName)) {
            return false;
        }

        if (value.baseSurfaceName !== null) {
            if (!valueRange.surfaceNamesInStratOrder.includes(value.baseSurfaceName)) {
                return false;
            }

            const topIndex = valueRange.surfaceNamesInStratOrder.indexOf(value.topSurfaceName);
            const bottomIndex = valueRange.surfaceNamesInStratOrder.indexOf(value.baseSurfaceName);

            if (topIndex === -1 || bottomIndex === -1 || topIndex > bottomIndex) {
                return false;
            }
        }

        if (!valueRange.realizationNums.includes(value.realizationNum)) {
            return false;
        }

        return true;
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        return function WellboreDepthFilterSettingComponent(
            props: SettingComponentProps<InternalValueType, ValueRangeType>,
        ) {
            const { onValueChange } = props;

            const topSurfaceOptions = React.useMemo(
                () =>
                    props.valueRange
                        ? props.valueRange.surfaceNamesInStratOrder.map((name) => ({
                              value: name,
                              label: name,
                          }))
                        : [],
                [props.valueRange],
            );

            const baseSurfaceOptions = React.useMemo(
                () =>
                    props.valueRange
                        ? [
                              { value: null, label: "None" },
                              ...props.valueRange.surfaceNamesInStratOrder.map((name) => ({
                                  value: name,
                                  label: name,
                              })),
                          ].filter((option) => option.value !== props.value?.topSurfaceName)
                        : [],
                [props.valueRange, props.value?.topSurfaceName],
            );

            const realizationNumOptions = React.useMemo(
                () =>
                    props.valueRange
                        ? props.valueRange.realizationNums.map((num) => ({
                              value: num,
                              label: num.toString(),
                          }))
                        : [],
                [props.valueRange],
            );

            const handleTopSurfaceChange = React.useCallback(
                function handleTopSurfaceChange(newTopSurfaceName: string | null) {
                    onValueChange((prev) => ({
                        ...prev,
                        realizationNum: prev?.realizationNum ?? 0,
                        baseSurfaceName:
                            prev?.baseSurfaceName &&
                            newTopSurfaceName &&
                            props.valueRange &&
                            props.valueRange.surfaceNamesInStratOrder.indexOf(prev.baseSurfaceName) >
                                props.valueRange.surfaceNamesInStratOrder.indexOf(newTopSurfaceName)
                                ? prev.baseSurfaceName
                                : null,
                        topSurfaceName: newTopSurfaceName,
                    }));
                },
                [onValueChange, props.valueRange],
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
                <div className="flex flex-col gap-2 mt-1">
                    <Label text="Top Surface:" labelClassName="text-xs">
                        <Dropdown
                            options={topSurfaceOptions}
                            value={props.value?.topSurfaceName}
                            onChange={handleTopSurfaceChange}
                        />
                    </Label>
                    <Label text="Base Surface:" labelClassName="text-xs">
                        <Dropdown
                            options={baseSurfaceOptions}
                            value={props.value?.baseSurfaceName}
                            onChange={handleBaseSurfaceChange}
                        />
                    </Label>
                    <Label text="Realization Number:" labelClassName="text-xs">
                        <Dropdown
                            options={realizationNumOptions}
                            value={props.value?.realizationNum}
                            onChange={handleRealizationNumChange}
                        />
                    </Label>
                </div>
            );
        };
    }
}
