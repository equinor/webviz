import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = {
    type: "wellbore" | "polyline";
    name: string;
    uuid: string;
};

export class IntersectionSetting implements Setting<ValueType | null> {
    private _delegate: SettingDelegate<ValueType | null>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.INTERSECTION;
    }

    getLabel(): string {
        return "Intersection";
    }

    getDelegate(): SettingDelegate<ValueType | null> {
        return this._delegate;
    }

    isValueValid(availableValues: any[], value: ValueType | null): boolean {
        if (value === null) {
            return true;
        }

        return availableValues.some((v) => v.uuid === value.uuid && v.type === value.type);
    }

    makeComponent(): (props: SettingComponentProps<ValueType | null>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<ValueType | null>) {
            const [type, setType] = React.useState<"wellbore" | "polyline" | "none">(props.value?.type ?? "none");
            function handleSelectionChange(selectedValue: string) {
                const newValue = props.availableValues.find((v) => v.uuid === selectedValue) ?? null;
                props.onValueChange(newValue);
            }

            function handleCategoryChange(_: any, value: "wellbore" | "polyline" | "none") {
                if (value === "none") {
                    props.onValueChange(null);
                    setType("none");
                } else {
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
                                label: "None",
                                value: "none",
                            },
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
                        disabled={props.isOverridden || type === "none"}
                        showArrows
                    />
                </div>
            );
        };
    }
}

SettingRegistry.registerSetting(IntersectionSetting);
