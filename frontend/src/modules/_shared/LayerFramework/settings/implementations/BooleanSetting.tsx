import type { ChangeEvent } from "react";
import type React from "react";

import { Switch } from "@lib/components/Switch";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

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
