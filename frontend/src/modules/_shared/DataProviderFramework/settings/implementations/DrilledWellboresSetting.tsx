import type React from "react";

import type { WellboreHeader_api } from "@api";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isStringArrayOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type InternalValueType = string[] | null;
type ExternalValueType = WellboreHeader_api[] | null;
type ValueRangeType = WellboreHeader_api[];

export class DrilledWellboresSetting
    implements CustomSettingImplementation<InternalValueType, ExternalValueType, ValueRangeType>
{
    defaultValue: InternalValueType = null;
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>(
        (a, b) => a.wellboreUuid === b.wellboreUuid,
    );

    mapInternalToExternalValue(internalValue: InternalValueType, valueRange: ValueRangeType): ExternalValueType {
        if (internalValue === null) {
            return null;
        }

        const externalValues = valueRange.filter((wellbore) => internalValue.includes(wellbore.wellboreUuid));
        return externalValues;
    }

    isValueValidStructure(value: unknown): value is InternalValueType {
        return isStringArrayOrNull(value);
    }

    fixupValue(currentValue: InternalValueType, valueRange: ValueRangeType): InternalValueType {
        const fixedValue = fixupValue<string, WellboreHeader_api>(
            currentValue,
            valueRange,
            mappingFunc,
            "allAvailable",
        );

        if (fixedValue.length === 0) {
            return valueRange.map(mappingFunc);
        }

        return fixedValue;
    }

    isValueValid(currentValue: InternalValueType, valueRange: ValueRangeType): boolean {
        function mappingFunc(value: WellboreHeader_api): string {
            return value.wellboreUuid;
        }
        return isValueValid<string, WellboreHeader_api>(currentValue, valueRange, mappingFunc);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueRangeType>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<InternalValueType, ValueRangeType>) {
            const valueRange = props.valueRange ?? [];

            const options: SelectOption[] = valueRange?.map((ident) => ({
                value: ident.wellboreUuid,
                label: ident.uniqueWellboreIdentifier,
            }));

            function handleChange(selectedUuids: string[]) {
                props.onValueChange(selectedUuids);
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

function mappingFunc(value: WellboreHeader_api): string {
    return value.wellboreUuid;
}
