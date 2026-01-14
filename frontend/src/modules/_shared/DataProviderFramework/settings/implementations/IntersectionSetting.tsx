import React from "react";

import { IntersectionType } from "@framework/types/intersection";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

export type IntersectionSettingValue = {
    type: IntersectionType;
    name: string;
    uuid: string;
};
type ValueType = IntersectionSettingValue | null;
type ValueConstraintsType = IntersectionSettingValue[];

export class IntersectionSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _activeIntersectionType = IntersectionType.WELLBORE;
    private _cachedValueByIntersectionType: Record<IntersectionType, ValueType> = {
        [IntersectionType.WELLBORE]: null,
        [IntersectionType.CUSTOM_POLYLINE]: null,
    };

    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>(
            (a, b) => a.type === b.type && a.uuid === b.uuid,
        );

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;
        if (typeof v.type !== "string" || typeof v.name !== "string" || typeof v.uuid !== "string") {
            throw new Error("Expected object with string properties: type, name, uuid");
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<ValueType, IntersectionSettingValue>(
            value,
            valueConstraints,
            (v) => v,
            (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
        );
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<ValueType, IntersectionSettingValue>(
            currentValue,
            valueConstraints,
            (v) => v,
            (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
        );
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const activeIntersectionType = this._activeIntersectionType;
        const setActiveIntersectionType = (type: IntersectionType) => {
            this._activeIntersectionType = type;
        };
        const cachedValueByIntersectionType = this._cachedValueByIntersectionType;
        const setCachedValueForIntersectionType = (type: IntersectionType, value: ValueType) => {
            this._cachedValueByIntersectionType[type] = value;
        };

        return function IntersectionSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const availableValues = props.valueConstraints ?? [];
            const [type, setType] = React.useState<IntersectionSettingValue["type"]>(
                props.value?.type ?? activeIntersectionType,
            );

            React.useEffect(() => {
                setActiveIntersectionType(type);
            }, [type]);

            function handleSelectionChange(selectedValue: string) {
                const newValue = availableValues.find((v) => v.uuid === selectedValue) ?? null;
                setCachedValueForIntersectionType(type, newValue);
                props.onValueChange(newValue);
            }

            function handleCategoryChange(_: any, value: IntersectionSettingValue["type"]) {
                setType(value);

                // Use cached value if valid, or pick first available value of the new type
                const candidateValue = cachedValueByIntersectionType[value];
                const newValue = candidateValue ?? availableValues.find((v) => v.type === value);
                if (newValue) {
                    props.onValueChange({
                        ...newValue,
                    });
                    return;
                }

                props.onValueChange(null);
            }

            const options: DropdownOption<string>[] = availableValues
                .filter((value) => value.type === type)
                .map((value) => {
                    return {
                        label: value.name,
                        value: value.uuid,
                    };
                });

            return (
                <div className="flex flex-col gap-2 my-1">
                    <RadioGroup
                        direction="horizontal"
                        options={[
                            {
                                label: "Wellbore",
                                value: IntersectionType.WELLBORE,
                            },
                            {
                                label: "Polyline",
                                value: IntersectionType.CUSTOM_POLYLINE,
                            },
                        ]}
                        value={type}
                        onChange={handleCategoryChange}
                    />
                    <Dropdown<string>
                        options={options}
                        placeholder={
                            type === IntersectionType.CUSTOM_POLYLINE ? "Select polyline..." : "Select wellbore..."
                        }
                        value={!props.isOverridden ? props.value?.uuid : props.overriddenValue?.uuid}
                        onChange={handleSelectionChange}
                        disabled={props.isOverridden}
                        showArrows
                    />
                </div>
            );
        };
    }
}
