import React from "react";

import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { Combobox } from "@lib/newComponents/Combobox";
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
            return <ColorGradient colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Categorical:
            return <ColorTileGroup colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Discrete:
            return <ColorGradient colorPalette={colorPalette} steps={steps} />;
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
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(
        props.colorPalettes.find((el) => el.getId() === props.selectedColorPaletteId) || props.colorPalettes[0],
    );

    function handleValueChange(colorPalette: ColorPalette | null) {
        if (!colorPalette) {
            return;
        }
        setSelectedColorPalette(colorPalette);
        props.onChange?.(colorPalette);
    }

    return (
        <Combobox
            items={props.colorPalettes}
            value={selectedColorPalette}
            onValueChange={handleValueChange}
            itemToStringLabel={(palette) => palette.getName()}
            itemToStringValue={(palette) => palette.getId()}
            filter={null}
            renderItemAdornment={(palette) => (
                <span className="min-w-32">{makeColorPalettePreview(palette, props.type, props.steps)}</span>
            )}
        />
    );
};
