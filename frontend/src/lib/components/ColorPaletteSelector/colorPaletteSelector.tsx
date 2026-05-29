import React from "react";

import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTile } from "@lib/newComponents/ColorTile";
import { Combobox } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/combobox";
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
            return <ColorGradient colorPalette={colorPalette} layoutClassName="w-24" size="small" />;
        case ColorPaletteSelectorType.Categorical:
            return <ColorTile.Group colorPalette={colorPalette} layoutClassName="w-24" size="small" />;
        case ColorPaletteSelectorType.Discrete:
            return <ColorGradient colorPalette={colorPalette} layoutClassName="w-24" steps={steps} size="small" />;
    }
}

export type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPaletteId: string;
    onChange?: (colorPalette: ColorPalette) => void;
    type: ColorPaletteSelectorType;
    steps?: number;
};

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    const selectedColorPalette =
        props.colorPalettes.find((el) => el.getId() === props.selectedColorPaletteId) ?? props.colorPalettes[0];

    const comboboxItems = React.useMemo(
        () =>
            props.colorPalettes.map<ComboboxItem<ColorPalette>>((palette) => ({
                value: palette,
                label: palette.getName(),
            })),
        [props.colorPalettes],
    );

    function handleValueChange(colorPalette: ColorPalette | null) {
        if (!colorPalette) {
            return;
        }
        props.onChange?.(colorPalette);
    }

    return (
        <Combobox
            items={comboboxItems}
            value={selectedColorPalette}
            onValueChange={handleValueChange}
            filter={null}
            renderItemAdornment={(palette) => (
                <span className="">{makeColorPalettePreview(palette, props.type, props.steps)}</span>
            )}
        />
    );
};
