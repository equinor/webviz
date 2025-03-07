import React, { ChangeEvent } from "react";

import { Switch } from "@lib/components/Switch";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsTypes";

type ValueType = boolean;

export class BooleanSetting implements CustomSettingImplementation<ValueType, SettingCategory.OTHER> {
    isValueValid(): boolean {
        return true;
    }

    getIsStatic(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.OTHER>) => React.ReactNode {
        return function BooleanSwitch(props: SettingComponentProps<ValueType, SettingCategory.OTHER>) {
            function handleChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange(e.target.checked);
            }

            return <Switch checked={props.value} onChange={handleChange} />;
        };
    }
}
