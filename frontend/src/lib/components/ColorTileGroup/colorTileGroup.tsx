import React from "react";

import { ColorPalette } from "@lib/utils/ColorPalette";

import { ColorTile } from "../ColorTile";

export type ColorPaletteProps = {
    colorPalette: ColorPalette;
};

export const ColorTileGroup: React.FC<ColorPaletteProps> = (props) => {
    return (
        <div className="flex">
            <div className="flex rounded border border-slate-600">
                {props.colorPalette.getColors().map((color) => (
                    <ColorTile key={color} color={color} grouped />
                ))}
            </div>
            <div className="flex-grow" />
        </div>
    );
};
