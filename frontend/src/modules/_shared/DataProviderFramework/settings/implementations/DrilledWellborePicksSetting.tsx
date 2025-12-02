import type React from "react";

import type { WellborePick_api } from "@api";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isStringArrayOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type InternalValueType = string[] | null;
type ExternalValueType = WellborePick_api[] | null;
type ValueRangeType = WellborePick_api[];

export class DrilledWellborePicksSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    defaultValue: InternalValueType = null;
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>(
        (a, b) => a.wellboreUuid === b.wellboreUuid,
    );

    mapInternalToExternalValue(internalValue: InternalValueType, valueRange: ValueRangeType): ExternalValueType {
        return valueRange.filter((pick) => internalValue?.includes(pick.pickIdentifier) ?? false);
    }

    isValueValidStructure(value: unknown): value is InternalValueType {
        return isStringArrayOrNull(value);
    }

    fixupValue(currentValue: InternalValueType, valueRange: ValueRangeType): InternalValueType {
        const fixedValue = fixupValue<string, WellborePick_api>(currentValue, valueRange, mappingFunc, "allAvailable");

        if (fixedValue.length === 0) {
            return valueRange.map(mappingFunc);
        }

        return fixedValue;
    }

    isValueValid(currentValue: InternalValueType, valueRange: ValueRangeType): boolean {
        function mappingFunc(value: WellborePick_api): string {
            return value.pickIdentifier;
        }
        return isValueValid<string, WellborePick_api>(currentValue, valueRange, mappingFunc);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        return function DrilledWellborePicks(props: SettingComponentProps<InternalValueType, ValueRangeType>) {
            const availableValues = props.valueRange ?? [];

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
