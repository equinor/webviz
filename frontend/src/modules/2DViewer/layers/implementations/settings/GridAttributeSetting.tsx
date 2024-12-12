import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingType } from "./settingsTypes";

import { SettingRegistry } from "../../SettingRegistry";
import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";

type ValueType = string | null;

export class GridAttributeSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.GRID_ATTRIBUTE;
    }

    getLabel(): string {
        return "Grid attribute";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
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
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}

SettingRegistry.registerSetting(GridAttributeSetting);
