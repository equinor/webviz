import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

export type IntersectionSettingValue = {
    type: "wellbore" | "polyline";
    name: string;
    uuid: string;
};

export class IntersectionSetting implements Setting<IntersectionSettingValue | null> {
    private _delegate: SettingDelegate<IntersectionSettingValue | null>;

    constructor() {
        this._delegate = new SettingDelegate<IntersectionSettingValue | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.INTERSECTION;
    }

    getLabel(): string {
        return "Intersection";
    }

    getDelegate(): SettingDelegate<IntersectionSettingValue | null> {
        return this._delegate;
    }

    isValueValid(availableValues: any[], value: IntersectionSettingValue | null): boolean {
        if (value === null) {
            return false;
        }

        return availableValues.some((v) => v.uuid === value.uuid && v.type === value.type);
    }

    fixupValue(availableValues: any[], currentValue: IntersectionSettingValue | null): IntersectionSettingValue | null {
        if (currentValue === null) {
            return availableValues.find((v) => v.type === "wellbore") ?? null;
        }

        if (availableValues.some((v) => v.uuid === currentValue.uuid && v.type === currentValue.type)) {
            return currentValue;
        }

        return availableValues.find((v) => v.type === currentValue.type) ?? null;
    }

    makeComponent(): (props: SettingComponentProps<IntersectionSettingValue | null>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<IntersectionSettingValue | null>) {
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

SettingRegistry.registerSetting(IntersectionSetting);
