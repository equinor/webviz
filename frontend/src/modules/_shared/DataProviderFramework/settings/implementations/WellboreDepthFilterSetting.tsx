import type { CustomSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

type InternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FILTER]["internalValue"] | null;
type ExternalValueType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FILTER]["externalValue"] | null;
type ValueRangeType = SettingTypeDefinitions[Setting.WELLBORE_DEPTH_FILTER]["valueRange"] | null;

export class WellboreDepthFilterSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    defaultValue: InternalValueType = { filterType: "none" };
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType, index: number) => {
            if (index === 0) {
                return valueRange;
            }

            if (accumulator === null || valueRange === null) {
                return null;
            }

            const mergedValueRange: ValueRangeType = accumulator;
            mergedValueRange.attributeNames = mergedValueRange.attributeNames.filter((name) =>
                valueRange.attributeNames.includes(name),
            );

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
        return true;
    }

    mapInternalToExternalValue(internalValue: InternalValueType): ExternalValueType {
        return internalValue;
    }

    isValueValid(value: InternalValueType, valueRange: ValueRangeType): boolean {
        if (value === null || valueRange === null) {
            return false;
        }

        if (value.filterType === "none") {
            return true;
        }

        if (value.filterType === "md_range" || value.filterType === "tvd_range") {
            return value.range[0] <= value.range[1];
        }

        if (value.filterType === "surface") {
            if (value.topSurfaceName === null || value.attributeName === null || value.realizationNum === null) {
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

            if (!valueRange.attributeNames.includes(value.attributeName)) {
                return false;
            }
        }
        return true;
    }
}
