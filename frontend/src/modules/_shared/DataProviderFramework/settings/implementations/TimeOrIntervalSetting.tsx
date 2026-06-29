import type React from "react";

import { SurfaceTimeType_api } from "@api";
import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import {
    isIsoIntervalString,
    isIsoString,
    isoIntervalStringToDateLabel,
    isoStringToDateLabel,
} from "@modules/_shared/utils/isoDatetimeStringFormatting";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

type ValueType = string | null;
type ValueConstraintsType = string[];

export class TimeOrIntervalSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    defaultValue: ValueType = null;

    valueConstraintsIntersectionReducerDefinition = {
        ...makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(),
        isValid: (): boolean => {
            return true;
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
        assertStringOrNull(parsed);
        return parsed;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        if (valueConstraints.length === 0) {
            return true;
        }
        return isValueValid<string, string>(value, valueConstraints, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<string, string>(currentValue, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function TimeOrIntervalSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];

            const options: ComboboxItem<string>[] = availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: timeTypeToLabel(value),
                };
            });

            return (
                <ComboboxCompositions.WithBrowseButtons
                    items={options}
                    placeholder="Select a date"
                    value={props.value?.toString()}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
                />
            );
        };
    }

    overriddenValueRepresentation(args: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        const { value } = args;
        if (value === null) {
            return "-";
        }
        return timeTypeToLabel(value);
    }
}

function timeTypeToLabel(input: string): string {
    if (input === SurfaceTimeType_api.NO_TIME) {
        return "No date";
    }
    if (isIsoIntervalString(input)) {
        return isoIntervalStringToDateLabel(input);
    }
    if (isIsoString(input)) {
        return isoStringToDateLabel(input);
    }
    // Fallback to the original input if it doesn't match any known format
    return input;
}
