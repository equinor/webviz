import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

type ValueType = number | null;

export class GridLayer implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType> = new SettingDelegate<ValueType>(null);

    getType(): SettingType {
        return SettingType.GRID_LAYER;
    }

    getLabel(): string {
        return "Grid layer";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
            const kRange = props.availableValues ? Array.from({ length: props.availableValues[2] }, (_, i) => i) : [];

            const options: DropdownOption[] = kRange.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(val: string) => props.onValueChange(parseInt(val))}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
