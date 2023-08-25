import React from "react";

import { ColorTile } from "@lib/components/ColorTile";
import { ColorPalette } from "@lib/utils/ColorPalette";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type ColorPaletteProps = {
    colorPalette: ColorPalette;
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
                    <ColorTile key={color} color={color} grouped />
                ))}
            </div>
            <div className="flex-grow" />
        </div>
    );
};
