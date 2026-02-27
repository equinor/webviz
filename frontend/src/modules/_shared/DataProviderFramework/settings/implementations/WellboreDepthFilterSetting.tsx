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
type ValueRangeType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FORMATION_FILTER]["valueConstraints"] | null;

export class WellboreDepthFilterSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
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
        if (value === null || valueConstraints === null) {
            return false;
        }

        if (value.topSurfaceName === null || value.realizationNum === null) {
            return false;
        }

        if (!valueConstraints.surfaceNamesInStratOrder.includes(value.topSurfaceName)) {
            return false;
        }

        if (value.baseSurfaceName !== null) {
            if (!valueConstraints.surfaceNamesInStratOrder.includes(value.baseSurfaceName)) {
                return false;
            }

            const topIndex = valueConstraints.surfaceNamesInStratOrder.indexOf(value.topSurfaceName);
            const bottomIndex = valueConstraints.surfaceNamesInStratOrder.indexOf(value.baseSurfaceName);

            if (topIndex === -1 || bottomIndex === -1 || topIndex > bottomIndex) {
                return false;
            }
        }

        if (!valueConstraints.realizationNums.includes(value.realizationNum)) {
            return false;
        }

        return true;
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
                              ...props.valueConstraints.surfaceNamesInStratOrder.map((name) => ({
                                  value: name,
                                  label: name,
                              })),
                          ].filter((option) => option.value !== props.value?.topSurfaceName)
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
