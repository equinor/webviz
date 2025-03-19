import React from "react";

import { ColorScaleConfig, ColorScaleSelector } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScalePreview } from "@lib/components/ColorScalePreview";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfaces";
import { SettingCategory } from "../settingsDefinitions";

type ValueType = ColorScaleConfig | null;

export class ColorScaleSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = {
        areBoundariesUserDefined: false,
        colorScale: new ColorScale({
            colorPalette: defaultContinuousSequentialColorPalettes[0],
            gradientType: ColorScaleGradientType.Sequential,
            type: ColorScaleType.Continuous,
            steps: 10,
        }),
    };

    getLabel(): string {
        return "Coloring";
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(): boolean {
        return true;
    }

    serializeValue(value: ValueType): string {
        const serializedValue = {
            areBoundariesUserDefined: value?.areBoundariesUserDefined ?? false,
            colorScale: value?.colorScale.serialize() ?? this.defaultValue?.colorScale.serialize(),
        };

        return JSON.stringify(serializedValue);
    }

    deserializeValue?(serializedValue: string): ValueType {
        const parsedValue = JSON.parse(serializedValue);

        return {
            areBoundariesUserDefined: parsedValue.areBoundariesUserDefined,
            colorScale: ColorScale.fromSerialized(parsedValue.colorScale),
        };
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function ColorScaleSelectorDialog(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
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

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (value === null) {
            return "-";
        }
        return (
            <ColorScalePreview
                colorPalette={value.colorScale.getColorPalette()}
                gradientType={value.colorScale.getGradientType()}
                discrete={value.colorScale.getType() === ColorScaleType.Discrete}
                steps={value.colorScale.getNumSteps()}
                min={value.colorScale.getMin()}
                max={value.colorScale.getMax()}
                divMidPoint={value.colorScale.getDivMidPoint()}
                id="color-scale-preview"
            />
        );
    }
}
