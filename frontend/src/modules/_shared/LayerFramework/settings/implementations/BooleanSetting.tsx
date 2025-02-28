import React, { ChangeEvent } from "react";

import { Switch } from "@lib/components/Switch";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";

type ValueType = boolean;

export class BooleanSetting implements CustomSettingImplementation<ValueType> {
    isValueValid(): boolean {
        return true;
    }

    getIsStatic(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function BooleanSwitch(props: SettingComponentProps<ValueType>) {
            function handleChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange(e.target.checked);
            }

            return <Switch checked={props.value} onChange={handleChange} />;
        };
    }
}
