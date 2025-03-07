import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import { AvailableValuesType, CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsTypes";

export type IntersectionSettingValue = {
    type: "wellbore" | "polyline";
    name: string;
    uuid: string;
};

type ValueType = IntersectionSettingValue | null;

export class IntersectionSetting implements CustomSettingImplementation<ValueType, SettingCategory.OPTION> {
    isValueValid(
        availableValues: AvailableValuesType<ValueType, SettingCategory.OPTION>,
        value: IntersectionSettingValue | null
    ): boolean {
        if (value === null) {
            return false;
        }

        return availableValues.some((v) => v.uuid === value.uuid && v.type === value.type);
    }

    fixupValue(
        availableValues: AvailableValuesType<ValueType, SettingCategory.OPTION>,
        currentValue: ValueType
    ): ValueType {
        if (currentValue === null) {
            return availableValues.find((v) => v.type === "wellbore") ?? null;
        }

        if (availableValues.some((v) => v.uuid === currentValue.uuid && v.type === currentValue.type)) {
            return currentValue;
        }

        return availableValues.find((v) => v.type === currentValue.type) ?? null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.OPTION>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<ValueType, SettingCategory.OPTION>) {
            const [type, setType] = React.useState<IntersectionSettingValue["type"]>(props.value?.type ?? "wellbore");
            function handleSelectionChange(selectedValue: string) {
                const newValue = props.availableValues.find((v) => v.uuid === selectedValue) ?? null;
                props.onValueChange(newValue);
            }

            function handleCategoryChange(_: any, value: IntersectionSettingValue["type"]) {
                setType(value);
                const firstValue = props.availableValues.find((v) => v.type === value);
                if (firstValue) {
                    props.onValueChange({
                        ...firstValue,
                    });
                    return;
                }

                props.onValueChange(null);
            }

            const options: DropdownOption<string>[] = props.availableValues
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
                                value: "wellbore",
                            },
                            {
                                label: "Polyline",
                                value: "polyline",
                            },
                        ]}
                        value={type}
                        onChange={handleCategoryChange}
                    />
                    <Dropdown<string>
                        options={options}
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
