import type React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/componentSizeContext";
import type { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorGradientProps = LayoutClassProps & {
    colorPalette: ColorPalette;
    steps?: number;
    size?: "small" | "default" | "large";
};

const SIZE_TO_CLASSNAMES: Record<NonNullable<ColorGradientProps["size"]>, string> = {
    small: "h-4",
    default: "h-5",
    large: "h-6",
};

function makeColorSamples(steps: number, colorPalette: ColorPalette) {
    const samples = [];

    for (let i = 0; i < steps; i++) {
        const color = colorPalette.getInterpolatedColor(i / (steps - 1));
        samples.push(
            <div
                key={`${color}-${i}`}
                className="h-full grow first-of-type:rounded-l last-of-type:rounded-r"
                style={{
                    backgroundColor: color,
                }}
            />,
        );
    }
    return samples;
}

export const ColorGradient: React.FC<ColorGradientProps> = (props) => {
    const { layoutClassName } = props;
    const size = useComponentSize(props);

    if (props.steps) {
        return (
            <div
                className={resolveClassNames(
                    layoutClassName,
                    SIZE_TO_CLASSNAMES[size],
                    "border-neutral-strong flex rounded border",
                )}
            >
                {makeColorSamples(props.steps, props.colorPalette)}
            </div>
        );
    }

    return (
        <div
            className={resolveClassNames(
                layoutClassName,
                SIZE_TO_CLASSNAMES[size],
                "border-neutral-strong rounded border",
            )}
            style={{
                backgroundImage: props.colorPalette.getGradient(),
            }}
        />
    );
};
