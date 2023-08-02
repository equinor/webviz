import React from "react";

import { ContinuousColorPalette } from "@lib/utils/ColorPalette";

export type ColorGradientProps = {
    colorPalette: ContinuousColorPalette;
};

export const ColorGradient: React.FC<ColorGradientProps> = (props) => {
    return (
        <div
            className="rounded border border-slate-600 h-5 w-full"
            style={{
                backgroundImage: props.colorPalette.getGradient(),
            }}
        ></div>
    );
};
