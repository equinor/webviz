import type React from "react";

import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = ColorSet | null;

export class ColorSetSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = new ColorSet(defaultColorPalettes[0]);

    getLabel(): string {
        return "Colors";
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(): boolean {
        return true;
    }

    serializeValue(value: ValueType): string {
        const serializedValue = value?.serialize();
        return JSON.stringify(serializedValue);
    }

    deserializeValue?(serializedValue: string): ValueType {
        const parsedValue = JSON.parse(serializedValue);
        return ColorSet.fromSerialized(parsedValue);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function ColorScaleSelectorDialog(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
            function handleColorPaletteChange(value: ColorPalette) {
                const newColorSet = new ColorSet(value);
                props.onValueChange(newColorSet);
            }

            return (
                <ColorPaletteSelector
                    selectedColorPaletteId={props.value?.getColorPalette().getId() ?? ""}
                    colorPalettes={defaultColorPalettes}
                    type={ColorPaletteSelectorType.Categorical}
                    onChange={handleColorPaletteChange}
                />
            );
        };
    }

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (value === null) {
            return "-";
        }
        return (
            <ColorPaletteSelector
                selectedColorPaletteId={value.getColorPalette().getId()}
                colorPalettes={defaultColorPalettes}
                type={ColorPaletteSelectorType.Categorical}
            />
        );
    }
}
