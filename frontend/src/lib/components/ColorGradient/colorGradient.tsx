import React from "react";

import { ColorPalette } from "@lib/utils/ColorPalette";

export type ColorGradientProps = {
    colorPalette: ColorPalette;
};

export const ColorGradient: React.FC<ColorGradientProps> = (props) => {
    return (
        <div
            className="rounded border border-slate-600 h-5 w-full"
            style={{
                backgroundImage: `linear-gradient(to right, ${props.colorPalette.getColors().join(", ")})`,
            }}
        ></div>
    );
};
