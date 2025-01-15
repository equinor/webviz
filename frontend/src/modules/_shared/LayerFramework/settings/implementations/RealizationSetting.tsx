import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

export class RealizationSetting implements Setting<number | null> {
    private _delegate: SettingDelegate<number | null>;

    constructor() {
        this._delegate = new SettingDelegate<number | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.REALIZATION;
    }

    getLabel(): string {
        return "Realization";
    }

    getDelegate(): SettingDelegate<number | null> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<number | null>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<number | null>) {
            function handleSelectionChange(selectedValue: string) {
                const newValue = parseInt(selectedValue);
                props.onValueChange(newValue);
            }

            const options: DropdownOption[] = props.availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });
            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={handleSelectionChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}

SettingRegistry.registerSetting(RealizationSetting);
