import type React from "react";

import { chain, sortBy } from "lodash";

import type { WellboreLogCurveHeader_api } from "@api";
import type { DropdownOption, DropdownOptionGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { makeSelectValueForCurveHeader } from "@modules/WellLogViewer/utils/strings";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = WellboreLogCurveHeader_api | null;

export class LogCurveSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_SELECT> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Curve";
    }

    fixupValue(currentValue: ValueType, availableValues: WellboreLogCurveHeader_api[]): ValueType {
        if (!currentValue) {
            // Match sorting used in dropdown
            return sortBy(availableValues, [sortStatLogsToTop, "logName", "curveName"])[0] ?? null;
        }
        // We look for any curve that at the least matches on curve name. Optimally, there's an entry that matches both
        // on curve *and* log name, but we'll accept it if at least the name matches
        let bestMatch = null;

        for (const value of availableValues) {
            if (value.curveName === currentValue?.curveName) {
                bestMatch = value;
                // If the both matches, there well be no better alternatives
                if (value.logName === currentValue.logName) break;
            }
        }

        return bestMatch;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
            const selectedValue = makeSelectValueForCurveHeader(props.value);
            const availableValues = props.availableValues ?? [];

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
