import React from "react";

import { ColorGradient } from "@lib/newComponents/ColorGradient";
import { ColorTile } from "@lib/newComponents/ColorTile";
import { Combobox, type ComboboxProps } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";
import type { ColorPalette } from "@lib/utils/ColorPalette";

export enum ColorPaletteSelectorType {
    Categorical = "categorical",
    Continuous = "continuous",
    Discrete = "discrete",
}

function makeColorPalettePreview(
    colorPalette: ColorPalette,
    type: ColorPaletteSelectorType,
    steps?: number,
): React.ReactNode {
    switch (type) {
        case ColorPaletteSelectorType.Continuous:
            return <ColorGradient colorPalette={colorPalette} layoutClassName="w-full" size="small" />;
        case ColorPaletteSelectorType.Categorical:
            return <ColorTile.Group colorPalette={colorPalette} layoutClassName="w-full" size="small" />;
        case ColorPaletteSelectorType.Discrete:
            return <ColorGradient colorPalette={colorPalette} layoutClassName="w-full" steps={steps} size="small" />;
    }
}

export type ColorPaletteSelectorProps = Omit<
    ComboboxProps<ColorPalette>,
    "items" | "value" | "renderItemAdornment" | "onValueChange" | "onValueCommit" | "defaultValue"
> & {
    /** The list of available color palettes to choose from. */
    colorPalettes: ColorPalette[];
    /** The ID of the currently selected color palette. */
    selectedColorPaletteId: string;
    /** Called when the user selects a different palette. */
    onValueChange?: (colorPalette: ColorPalette) => void;
    /** Determines how the palette preview is rendered in each dropdown item. */
    type: ColorPaletteSelectorType;
    /** Number of discrete steps shown in the preview. Only used when `type` is `Discrete`. */
    steps?: number;
    /** Whether the selector is disabled. */
    disabled?: boolean;
};

export const ColorPaletteSelector = React.forwardRef<HTMLInputElement, ColorPaletteSelectorProps>(
    function ColorPaletteSelector(props, ref) {
        const { colorPalettes, selectedColorPaletteId, onValueChange, type, steps, ...comboboxProps } = props;

        const selectedColorPalette =
            colorPalettes.find((el) => el.getId() === selectedColorPaletteId) ?? colorPalettes[0];

        const comboboxItems = React.useMemo(
            () =>
                colorPalettes.map<ComboboxItem<ColorPalette>>((palette) => ({
                    value: palette,
                    label: palette.getName(),
                })),
            [colorPalettes],
        );

        const handleValueChange = React.useCallback(
            function handleValueChange(colorPalette: ColorPalette | null) {
                if (!colorPalette) {
                    return;
                }
                onValueChange?.(colorPalette);
            },
            [onValueChange],
        );

        return (
            <Combobox
                {...comboboxProps}
                ref={ref}
                items={comboboxItems}
                value={selectedColorPalette}
                onValueChange={handleValueChange}
                filter={null}
                renderItemAdornment={(palette) => (
                    <span className="flex w-24 min-w-0">{makeColorPalettePreview(palette, type, steps)}</span>
                )}
            />
        );
    },
);
