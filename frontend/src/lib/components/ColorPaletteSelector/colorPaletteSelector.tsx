import React from "react";

import { ColorGradient } from "@lib/components/ColorGradient";
import { Combobox } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/combobox";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorTile } from "@lib/newComponents/ColorTile";

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
            return <ColorTile.Group colorPalette={colorPalette} size="small" />;
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
        setSelectedColorPalette(colorPalette);
        props.onChange?.(colorPalette);
    }

    return (
        <Combobox
            items={comboboxItems}
            value={selectedColorPalette}
            onValueChange={handleValueChange}
            filter={null}
            renderItemAdornment={(palette) => (
                <span className="min-w-32">{makeColorPalettePreview(palette, props.type, props.steps)}</span>
            )}
        />
    );
};
