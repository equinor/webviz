import type React from "react";

import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { ColorScaleSelector } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScalePreview } from "@lib/components/ColorScalePreview";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = ColorScaleSpecification | null;

export class ColorScaleSetting implements CustomSettingImplementation<ValueType, ValueType> {
    defaultValue: ValueType;

    constructor(props?: { initialColorScale?: ColorScaleSpecification }) {
        this.defaultValue = props?.initialColorScale ?? {
            areBoundariesUserDefined: false,
            colorScale: new ColorScale({
                colorPalette: defaultContinuousSequentialColorPalettes[0],
                gradientType: ColorScaleGradientType.Sequential,
                type: ColorScaleType.Continuous,
                steps: 10,
            }),
        };
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        if (value === null) {
            return true;
        }

        if (typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const v = value as Record<string, unknown>;
        return (
            typeof v.areBoundariesUserDefined === "boolean" &&
            typeof v.colorScale === "object" &&
            v.colorScale !== null
        );
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

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function ColorScaleSelectorDialog(props: SettingComponentProps<ValueType>) {
            function handleChange(value: ColorScaleSpecification) {
                props.onValueChange(value);
            }

            return (
                <ColorScaleSelector
                    workbenchSettings={props.workbenchSettings}
                    colorScaleSpecification={props.value ?? undefined}
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
