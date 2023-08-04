import React from "react";

import { CategoricalColorPalette } from "@lib/utils/ColorPalette";

import { ColorTile } from "../ColorTile";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type ColorPaletteProps = {
    colorPalette: CategoricalColorPalette;
    gap?: boolean;
};

export const ColorTileGroup: React.FC<ColorPaletteProps> = (props) => {
    return (
        <div className="flex">
            <div
                className={resolveClassNames("flex w-full", {
                    "gap-1": props.gap,
                    "rounded border border-slate-600": !props.gap,
                })}
            >
                {props.colorPalette.getColors().map((color) => (
                    <ColorTile key={color.id} color={color.hexColor} grouped />
                ))}
            </div>
            <div className="flex-grow" />
        </div>
    );
};
