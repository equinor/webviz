import React from "react";

import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { ColorPalette } from "@lib/utils/ColorPalette";

export type ColorPaletteSelectorProps = {
    selectedPaletteUuid?: string;
    onSelectPalette?: (uuid: string) => void;
    colorPalettes?: ColorPalette[];
    continuous?: boolean;
};

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    let selectedColorPalette = props.colorPalettes?.find((palette) => palette.getUuid() === props.selectedPaletteUuid);
    if (!selectedColorPalette && props.colorPalettes && props.colorPalettes?.length > 0) {
        selectedColorPalette = props.colorPalettes[0];
    }

    if (!selectedColorPalette) {
        return <div className="bg-slate-200 rounded p-2" />;
    }

    return (
        <div className="bg-slate-200 rounded p-2">
            {props.continuous ? (
                <ColorGradient colorPalette={selectedColorPalette} />
            ) : (
                <ColorTileGroup colorPalette={selectedColorPalette} />
            )}
        </div>
    );
};
