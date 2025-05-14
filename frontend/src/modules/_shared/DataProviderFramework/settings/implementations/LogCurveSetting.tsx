import type React from "react";

import _ from "lodash";

import type { WellboreLogCurveHeader_api } from "@api";
import { Dropdown, type DropdownOptionGroup } from "@lib/components/Dropdown";
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

    // TODO: Set up serialization
    // serializeValue(value: ValueType): string {
    //     if (!value) return "";
    //     return [value.source, value.logName, value.curveName].join("::");
    // }

    // deserializeValue(serializedValue: string): ValueType {
    //     if(!serializedValue) return null
    //     else return null
    // }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
            const selectedValue = makeSelectValueForCurveHeader(props.value);
            const availableValues = props.availableValues ?? [];

            const curveOptions = _.chain(availableValues)
                .groupBy("logName")
                .entries()
                .map<DropdownOptionGroup>(([logName, curves]) => ({
                    label: logName,
                    options: curves.map((curve) => ({
                        value: makeSelectValueForCurveHeader(curve),
                        label: curve.curveName,
                    })),
                }))
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
