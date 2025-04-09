import type React from "react";

import { ColorSelect } from "@lib/components/ColorSelect";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

export class SingleColorSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = null;

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(value: ValueType): boolean {
        if (!value) return false;

        return /^#[0-9A-Fa-f]{6}$/.test(value); // Validates hex color
    }

    serializeValue(value: ValueType): string {
        return value ?? "";
    }

    deserializeValue?(serializedValue: string): ValueType {
        if (serializedValue === "") return null;
        return serializedValue;
    }

    fixupValue(value: ValueType): NonNullable<ValueType> {
        if (!value) return "#ffffff";
        return value;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function SingleColorSettingComponent(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
            function handleColorChange(color: string) {
                props.onValueChange(color);
            }

            return (
                <div className="single-color-setting">
                    <ColorSelect onChange={handleColorChange} value={props.value ?? "#ffffff"} dense />
                </div>
            );
        };
    }

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (!value) {
            return "-";
        }
        return (
            <div
                style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: value,
                    border: "1px solid #ccc",
                }}
            />
        );
    }
}
