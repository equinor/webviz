import React from "react";

import { ColorScaleConfig, ColorScaleSelector } from "@framework/components/ColorScaleSelector/colorScaleSelector";

import { CustomSettingImplementation, SettingComponentProps } from "../../interfaces";
import { SettingCategory } from "../settingsTypes";

type ValueType = ColorScaleConfig | null;

export class ColorScaleSetting implements CustomSettingImplementation<ValueType, SettingCategory.OTHER> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Coloring";
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(): boolean {
        return true;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.OTHER>) => React.ReactNode {
        return function ColorScaleSelectorDialog(props: SettingComponentProps<ValueType, SettingCategory.OTHER>) {
            function handleChange(value: ColorScaleConfig) {
                props.onValueChange(value);
            }

            return (
                <ColorScaleSelector
                    workbenchSettings={props.workbenchSettings}
                    colorScaleConfig={props.value ?? undefined}
                    onChange={handleChange}
                />
            );
        };
    }
}
