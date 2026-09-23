import type React from "react";

import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { isIsoString, isoStringToDateLabel } from "@modules/_shared/utils/isoDatetimeStringFormatting";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringArrayOrNull } from "../utils/structureValidation";

import { makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

/** Base and monitor time point, used to calculate a difference between two time steps. */
type ValueType = [string, string] | null;
type ValueConstraintsType = string[];

export class TimePointPairSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;

    valueConstraintsIntersectionReducerDefinition = {
        ...makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(),
        isValid: (valueConstraints: ValueConstraintsType): boolean => {
            return valueConstraints.length >= 2;
        },
    };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringArrayOrNull(parsed);

        if (parsed === null) {
            return null;
        }
        if (parsed.length !== 2) {
            throw new Error(`Expected an array of exactly 2 strings, got ${parsed.length}`);
        }

        return [parsed[0], parsed[1]];
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        // A pair cannot be formed from less than two time points, so don't hold back the whole settings context
        if (valueConstraints.length < 2) {
            return true;
        }

        if (value === null) {
            return false;
        }

        return value[0] !== value[1] && valueConstraints.includes(value[0]) && valueConstraints.includes(value[1]);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        if (valueConstraints.length < 2) {
            return null;
        }

        const firstValue = valueConstraints[0];
        const lastValue = valueConstraints[valueConstraints.length - 1];

        if (currentValue === null) {
            return [firstValue, lastValue];
        }

        const base = valueConstraints.includes(currentValue[0]) ? currentValue[0] : firstValue;
        let monitor = valueConstraints.includes(currentValue[1]) ? currentValue[1] : lastValue;
        if (base === monitor) {
            monitor = base === lastValue ? firstValue : lastValue;
        }

        return [base, monitor];
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function TimePointPairSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const options: ComboboxItem<string>[] = (props.valueConstraints ?? []).map((value) => ({
                value,
                label: timePointToLabel(value),
            }));

            const base = props.value?.[0];
            const monitor = props.value?.[1];

            function handleBaseChange(newBase: string | null) {
                if (newBase === null) {
                    return;
                }
                props.onValueChange((prevValue) => [newBase, prevValue?.[1] ?? newBase]);
            }

            function handleMonitorChange(newMonitor: string | null) {
                if (newMonitor === null) {
                    return;
                }
                props.onValueChange((prevValue) => [prevValue?.[0] ?? newMonitor, newMonitor]);
            }

            return (
                <div className="gap-y-3xs flex flex-col">
                    <div className="gap-x-3xs flex items-center">
                        <span className="w-16 shrink-0 text-xs">Base</span>
                        <Combobox
                            layoutClassName="w-full"
                            items={options}
                            value={base}
                            onValueChange={handleBaseChange}
                            disabled={props.disabled}
                        />
                    </div>
                    <div className="gap-x-3xs flex items-center">
                        <span className="w-16 shrink-0 text-xs">Monitor</span>
                        <Combobox
                            layoutClassName="w-full"
                            items={options}
                            value={monitor}
                            onValueChange={handleMonitorChange}
                            disabled={props.disabled}
                        />
                    </div>
                </div>
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (args.value === null) {
            return "-";
        }
        return `${timePointToLabel(args.value[0])} → ${timePointToLabel(args.value[1])}`;
    }
}

function timePointToLabel(input: string): string {
    if (isIsoString(input)) {
        return isoStringToDateLabel(input);
    }
    return input;
}
