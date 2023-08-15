import React from "react";

import { ContinuousColorPalette } from "@lib/utils/ColorPalette";

export type ColorGradientProps = {
    colorPalette: ContinuousColorPalette;
    steps?: number;
};

function makeColorSamples(steps: number, colorPalette: ContinuousColorPalette) {
    const samples = [];

    for (let i = 0; i < steps; i++) {
        const color = colorPalette.getColorAtPosition(i / (steps - 1));
        samples.push(
            <div
                key={color}
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
