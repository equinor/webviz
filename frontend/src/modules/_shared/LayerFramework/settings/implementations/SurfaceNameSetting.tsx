import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import type { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = string | null;

export class SurfaceNameSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.SURFACE_NAME;
    }

    getLabel(): string {
        return "Surface name";
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

SettingRegistry.registerSetting(SurfaceNameSetting);
