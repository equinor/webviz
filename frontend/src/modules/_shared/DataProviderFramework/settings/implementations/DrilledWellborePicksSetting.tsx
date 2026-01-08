import type React from "react";

import type { WellborePick_api } from "@api";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringArrayOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arrayMultiSelect";

type InternalValueType = string[] | null;
type ExternalValueType = WellborePick_api[] | null;
type ValueConstraintsType = WellborePick_api[];

export class DrilledWellborePicksSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueConstraintsType>
{
    defaultValue: InternalValueType = null;
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(
            (a, b) => a.wellboreUuid === b.wellboreUuid,
        );

    mapInternalToExternalValue(
        internalValue: InternalValueType,
        valueConstraints: ValueConstraintsType,
    ): ExternalValueType {
        return valueConstraints.filter((pick) => internalValue?.includes(pick.pickIdentifier) ?? false);
    }

    serializeValue(value: InternalValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): InternalValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringArrayOrNull(parsed);
        return parsed;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueConstraintsType): InternalValueType {
        const fixedValue = fixupValue<string, WellborePick_api>(
            currentValue,
            valueConstraints,
            mappingFunc,
            "allAvailable",
        );

        if (fixedValue.length === 0) {
            return valueConstraints.map(mappingFunc);
        }

        return fixedValue;
    }

    isValueValid(currentValue: InternalValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<string, WellborePick_api>(currentValue, valueConstraints, mappingFunc);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueConstraintsType>) => React.ReactNode {
        return function DrilledWellborePicks(props: SettingComponentProps<InternalValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];

            // Prevent duplicated pickIdentifiers in the options
            const uniquePickIdentifiers = Array.from(new Set(availableValues.map((ident) => ident.pickIdentifier)));
            const options: SelectOption[] = uniquePickIdentifiers.map((pickIdentifier) => ({
                value: pickIdentifier,
                label: pickIdentifier,
            }));

            function handleChange(selectedIdentifiers: string[]) {
                props.onValueChange(selectedIdentifiers);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={props.value ?? []}
                        onChange={handleChange}
                        showQuickSelectButtons={true}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}

function mappingFunc(value: WellborePick_api): string {
    return value.pickIdentifier;
}
