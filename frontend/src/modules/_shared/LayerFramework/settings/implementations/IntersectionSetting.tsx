import React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

export type IntersectionSettingValue = {
    type: "wellbore" | "polyline";
    name: string;
    uuid: string;
};

type ValueType = IntersectionSettingValue | null;

export class IntersectionSetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_SELECT> {
    isValueValid(
        value: IntersectionSettingValue | null,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.SINGLE_SELECT>
    ): boolean {
        if (value === null) {
            return false;
        }

        return availableValues.some((v) => v.uuid === value.uuid && v.type === value.type);
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.SINGLE_SELECT>
    ): ValueType {
        if (currentValue === null) {
            return availableValues.find((v) => v.type === "wellbore") ?? null;
        }

        if (availableValues.some((v) => v.uuid === currentValue.uuid && v.type === currentValue.type)) {
            return currentValue;
        }

        return availableValues.find((v) => v.type === currentValue.type) ?? null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_SELECT>) {
            const availableValues = props.availableValues ?? [];

            const [type, setType] = React.useState<IntersectionSettingValue["type"]>(props.value?.type ?? "wellbore");
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
