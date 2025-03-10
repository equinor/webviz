import type { ChangeEvent } from "react";
import type React from "react";

import { Switch } from "@lib/components/Switch";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import type { Setting, SettingComponentProps } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

type ValueType = boolean;

export class ShowGridLinesSetting implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType>;

    constructor() {
        this._delegate = new SettingDelegate<ValueType>(false, this, true);
    }

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Show grid lines";
    }

    isValueValid(): boolean {
        return true;
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function ShowGridLines(props: SettingComponentProps<ValueType>) {
            function handleChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange(e.target.checked);
            }

            return <Switch checked={props.value} onChange={handleChange} />;
        };
    }
}

SettingRegistry.registerSetting(ShowGridLinesSetting);
