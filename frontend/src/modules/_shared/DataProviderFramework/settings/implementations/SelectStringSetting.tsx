import React from "react";

import { upperFirst } from "lodash";

import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isStringArrayOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arrayMultiSelect";

type ValueType = string[] | null;
type ValueConstraintsType = string[];

export class SelectStringSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isStringArrayOrNull(value);
    }

    isValueValid(currentValue: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<string, string>(currentValue, valueConstraints, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<string, string>(currentValue, valueConstraints, (v) => v, "firstAvailable");
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function SelectStringSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const options: SelectOption[] = React.useMemo(() => {
                const availableValues = props.valueConstraints ?? [];
                return availableValues.map((stringVals) => ({
                    value: stringVals,
                    label: upperFirst(stringVals),
                }));
            }, [props.valueConstraints]);

            function handleChange(selectedUuids: string[]) {
                props.onValueChange(selectedUuids);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={props.value ?? undefined}
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
