import React from "react";

import { IntersectionType } from "@framework/types/intersection";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

export type IntersectionSettingValue = {
    type: IntersectionType;
    name: string;
    uuid: string;
};
type ValueType = IntersectionSettingValue | null;
type ValueRangeType = IntersectionSettingValue[];

export class IntersectionSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _activeType = IntersectionType.WELLBORE;
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<ValueRangeType>(
        (a, b) => a.uuid === b.uuid,
    );

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        if (value === null) {
            return true;
        }

        if (typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const v = value as Record<string, unknown>;
        return typeof v.type === "string" && typeof v.name === "string" && typeof v.uuid === "string";
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<ValueType, IntersectionSettingValue>(value, valueRange, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<ValueType, IntersectionSettingValue>(
            currentValue,
            valueRange,
            (v) => v,
            (a, b) => a?.type === b?.type && a?.uuid === b?.uuid,
        );
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const activeType = this._activeType;
        const setActiveType = (type: IntersectionType) => {
            this._activeType = type;
        };

        return function IntersectionSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const availableValues = props.valueRange ?? [];
            const [type, setType] = React.useState<IntersectionSettingValue["type"]>(props.value?.type ?? activeType);

            React.useEffect(() => {
                setActiveType(type);
            }, [type]);

            function handleSelectionChange(selectedValue: string) {
                const newValue = availableValues.find((v) => v.uuid === selectedValue) ?? null;
                props.onValueChange(newValue);
            }

            function handleCategoryChange(_: any, value: IntersectionSettingValue["type"]) {
                setType(value);
                const firstValue = availableValues.find((v) => v.type === value);
                if (firstValue) {
                    props.onValueChange({
                        ...firstValue,
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
