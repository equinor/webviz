import type React from "react";

import { chain, isEqual, sortBy } from "lodash";

import type { WellboreLogCurveHeader_api } from "@api";
import type { DropdownOption, DropdownOptionGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { makeSelectValueForCurveHeader } from "@modules/_shared/utils/wellLog";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import { isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = WellboreLogCurveHeader_api | null;
type ValueConstraintsType = WellboreLogCurveHeader_api[];

export class LogCurveSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<WellboreLogCurveHeader_api[]>(
        (a, b) => isEqual(a, b),
    );

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
        return (
            typeof v.logName === "string" &&
            typeof v.curveName === "string" &&
            typeof v.curveUnit === "string" &&
            typeof v.curveDescription === "string"
        );
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        if (!currentValue) {
            // Match sorting used in dropdown
            return sortBy(valueConstraints, [sortStatLogsToTop, "logName", "curveName"])[0] ?? null;
        }
        // We look for any curve that at the least matches on curve name. Optimally, there's an entry that matches both
        // on curve *and* log name, but we'll accept it if at least the name matches
        let bestMatch = null;

        for (const value of valueConstraints) {
            if (value.curveName === currentValue?.curveName) {
                bestMatch = value;
                // If the both matches, there well be no better alternatives
                if (value.logName === currentValue.logName) break;
            }
        }

        return bestMatch;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<ValueType, WellboreLogCurveHeader_api>(value, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const selectedValue = makeSelectValueForCurveHeader(props.value);
            const availableValues = props.valueConstraints ?? [];

            const curveOptions = chain(availableValues)
                .groupBy("logName")
                .entries()
                .map(makeLogOptionGroup)
                .sortBy([sortStatLogsToTop, "label"])
                .value();

            function handleChange(selectedIdent: string) {
                const selected = availableValues.find((v) => makeSelectValueForCurveHeader(v) === selectedIdent);

                props.onValueChange(selected ?? null);
            }

            return (
                <Dropdown
                    filter
                    options={curveOptions}
                    value={selectedValue}
                    onChange={handleChange}
                    disabled={props.isOverridden}
                />
            );
        };
    }
}

function makeCurveOption(curve: WellboreLogCurveHeader_api): DropdownOption {
    return {
        value: makeSelectValueForCurveHeader(curve),
        label: curve.curveName,
    };
}

function makeLogOptionGroup([logName, logCurves]: [string, WellboreLogCurveHeader_api[]]): DropdownOptionGroup {
    return {
        label: logName,
        options: chain(logCurves).map(makeCurveOption).sortBy("label").value(),
    };
}

// It's my understanding that the STAT logs are the main curves users' would care about, so sorting them to the top first
function sortStatLogsToTop(group: DropdownOptionGroup | WellboreLogCurveHeader_api) {
    let logName = "";
    if ("logName" in group) logName = group.logName;
    if ("label" in group) logName = group.label;

    return logName.startsWith("STAT_") ? 0 : 1;
}
