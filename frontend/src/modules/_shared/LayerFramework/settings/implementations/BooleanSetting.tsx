import React, { ChangeEvent } from "react";

import { Switch } from "@lib/components/Switch";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = boolean;
export class BooleanSetting implements CustomSettingImplementation<ValueType, SettingCategory.BOOLEAN> {
    isValueValid(): boolean {
        return true;
    }

    getIsStatic(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.BOOLEAN>) => React.ReactNode {
        return function BooleanSwitch(props: SettingComponentProps<ValueType, SettingCategory.BOOLEAN>) {
            function handleChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange(e.target.checked);
            }

            return <Switch checked={props.value} onChange={handleChange} />;
        };
    }
}
