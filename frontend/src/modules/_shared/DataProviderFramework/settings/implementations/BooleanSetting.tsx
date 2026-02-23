import type { ChangeEvent } from "react";
import type React from "react";

import { Switch } from "@lib/components/Switch";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = boolean;
export class BooleanSetting implements CustomSettingImplementation<ValueType, ValueType> {
    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        if (typeof parsed !== "boolean") {
            throw new Error("Expected boolean");
        }
        return parsed;
    }

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
