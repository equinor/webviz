import React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ColorGradientProps = LayoutClassProps & {
    /** The color palette used to generate the gradient. */
    colorPalette: ColorPalette;
    /** Number of discrete color steps to render. When omitted, a continuous CSS gradient is used. */
    steps?: number;
    /** Controls the height of the gradient bar. @default "default" */
    size?: SelectableSize;
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
                style={{ backgroundColor: color }}
            />,
        );
    }
    return samples;
}

export const ColorGradient = React.forwardRef<HTMLDivElement, ColorGradientProps>(function ColorGradient(props, ref) {
    const size = useComponentSize(props);

    if (props.steps) {
        return (
            <div
                ref={ref}
                style={props.layoutStyle}
                className={resolveClassNames(
                    props.layoutClassName,
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
            ref={ref}
            style={{ ...props.layoutStyle, backgroundImage: props.colorPalette.getGradient() }}
            className={resolveClassNames(
                props.layoutClassName,
                SIZE_TO_CLASSNAMES[size],
                "border-neutral-strong rounded border",
            )}
        />
    );
});
