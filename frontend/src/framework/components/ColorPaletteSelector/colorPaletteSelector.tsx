import React from "react";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";

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
        return <div className="bg-slate-100 rounded p-2" />;
    }

    return (
        <div className="bg-slate-100 rounded p-2 flex items-center gap-4">
            <div className="flex-grow">
                {props.continuous ? (
                    <ColorGradient colorPalette={selectedColorPalette as ContinuousColorPalette} />
                ) : (
                    <ColorTileGroup colorPalette={selectedColorPalette as CategoricalColorPalette} />
                )}
            </div>
            <IconButton>
                <ChevronDownIcon className="flex-grow-0 w-4 h-4" />
            </IconButton>
        </div>
    );
};
