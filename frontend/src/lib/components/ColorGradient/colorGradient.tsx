import React from "react";

import { ColorPalette } from "@lib/utils/ColorPalette";

export type ColorGradientProps = {
    colorPalette: ColorPalette;
    steps?: number;
};

function makeColorSamples(steps: number, colorPalette: ColorPalette) {
    const samples = [];

    for (let i = 0; i < steps; i++) {
        const color = colorPalette.getInterpolatedColor(i / (steps - 1));
        samples.push(
            <div
                key={`${color}-${i}`}
                className="border border-slate-600 h-5 w-full"
                style={{
                    backgroundColor: color,
                }}
            ></div>
        );
    }
    return samples;
}

export const ColorGradient: React.FC<ColorGradientProps> = (props) => {
    if (props.steps) {
        return (
            <div className="flex gap-0.5 flex-row justify-between">
                {makeColorSamples(props.steps, props.colorPalette)}
            </div>
        );
    }

    return (
        <div
            className="rounded border border-slate-600 h-5 w-full"
            style={{
                backgroundImage: props.colorPalette.getGradient(),
            }}
        ></div>
    );
};
