import React from "react";

import { CategoricalColorPalette } from "@lib/utils/ColorPalette";

import { ColorTile } from "../ColorTile";

export type ColorPaletteProps = {
    colorPalette: CategoricalColorPalette;
};

export const ColorTileGroup: React.FC<ColorPaletteProps> = (props) => {
    return (
        <div className="flex">
            <div className="flex rounded border border-slate-600 w-full">
                {props.colorPalette.getColors().map((color) => (
                    <ColorTile key={color.id} color={color.hexColor} grouped />
                ))}
            </div>
            <div className="flex-grow" />
        </div>
    );
};
