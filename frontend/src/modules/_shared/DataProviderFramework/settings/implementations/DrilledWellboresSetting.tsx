import type React from "react";

import type { WellboreHeader_api } from "@api";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringArrayOrAllOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arrayMultiSelect";

// "all" means "every currently available wellbore" - unlike a snapshot of uuids, it automatically
// tracks the available-options list as it changes (e.g. across ensemble/context switches) instead of
// being fixed to whichever wellbores existed when it was selected.
type InternalValueType = string[] | "all" | null;
type ExternalValueType = WellboreHeader_api[] | null;
type ValueConstraintsType = WellboreHeader_api[];

export class DrilledWellboresSetting implements CustomSettingImplementation<
    InternalValueType,
    ExternalValueType,
    ValueConstraintsType
> {
    defaultValue: InternalValueType = null;
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(
            (a, b) => a.wellboreUuid === b.wellboreUuid,
        );

    mapInternalToExternalValue(
        internalValue: InternalValueType,
        valueConstraints: ValueConstraintsType,
    ): ExternalValueType {
        if (internalValue === null) {
            return null;
        }
        if (internalValue === "all") {
            return valueConstraints;
        }

        const externalValues = valueConstraints.filter((wellbore) => internalValue.includes(wellbore.wellboreUuid));
        return externalValues;
    }

    serializeValue(value: InternalValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): InternalValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringArrayOrAllOrNull(parsed);
        return parsed;
    }

    fixupValue(currentValue: InternalValueType, valueConstraints: ValueConstraintsType): InternalValueType {
        if (currentValue === "all") {
            return "all";
        }

        const fixedValue = fixupValue<string, WellboreHeader_api>(
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
        if (currentValue === "all") {
            return true;
        }
        return isValueValid<string, WellboreHeader_api>(currentValue, valueConstraints, mappingFunc);
    }

    makeComponent(): (props: SettingComponentProps<InternalValueType, ValueConstraintsType>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<InternalValueType, ValueConstraintsType>) {
            const valueConstraints = props.valueConstraints ?? [];
            const allUuids = valueConstraints.map(mappingFunc);
            const isAllSelected = props.value === "all";

            const options: SelectOption[] = valueConstraints?.map((ident) => ({
                value: ident.wellboreUuid,
                label: ident.uniqueWellboreIdentifier,
            }));

            function handleChange(selectedUuids: string[]) {
                props.onValueChange(selectedUuids);
            }

            function handleSelectAllChange(checked: boolean) {
                props.onValueChange(checked ? "all" : allUuids);
            }

            return (
                <div className="gap-3xs py-2xs flex flex-col justify-center">
                    <RadioCompositions.GroupWithLabels
                        value={isAllSelected ? "all" : "custom"}
                        onValueChange={(value) => handleSelectAllChange(value === "all")}
                        options={[
                            { value: "all", label: "Show all" },
                            { value: "custom", label: "Select custom" },
                        ]}
                        layout="horizontal"
                        size="small"
                        disabled={props.disabled}
                    />
                    {!isAllSelected && (
                        <Select
                            filter
                            options={options}
                            value={props.value === "all" ? allUuids : (props.value ?? [])}
                            onValueChange={handleChange}
                            disabled={props.disabled || isAllSelected}
                            multiple={true}
                            size={5}
                        />
                    )}
                </div>
            );
        };
    }
}

function mappingFunc(value: WellboreHeader_api): string {
    return value.wellboreUuid;
}
