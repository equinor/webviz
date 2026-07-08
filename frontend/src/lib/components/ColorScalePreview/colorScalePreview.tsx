import React from "react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/components/_shared/utils/size";
import type { LayoutClassProps } from "@lib/components/_shared/utils/wrapperProps";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ColorGradientProps } from "../ColorGradient/colorGradient";

export type ColorScalePreviewProps = {
    /** The color palette used to build the color scale. */
    colorPalette: ColorPalette;
    /** Whether the gradient runs sequentially or diverges from a midpoint. */
    gradientType: ColorScaleGradientType;
    /** When true, renders the scale as discrete steps rather than a continuous gradient. */
    discrete: boolean;
    /** Number of discrete steps. Only meaningful when `discrete` is true. */
    steps: number;
    /** The minimum value of the data range. */
    min: number;
    /** The maximum value of the data range. */
    max: number;
    /** The midpoint value for diverging gradients. */
    divMidPoint: number;
    /** Unique identifier used to namespace the SVG gradient definition. */
    id: string;
    /** Controls the height of the preview bar. @default "default" */
    size?: SelectableSize;
} & LayoutClassProps;

const SIZE_TO_CLASSNAMES: Record<NonNullable<ColorGradientProps["size"]>, string> = {
    small: "h-4",
    default: "h-5",
    large: "h-6",
};

export const ColorScalePreview = React.forwardRef<SVGSVGElement, ColorScalePreviewProps>(
    function ColorScalePreview(props, ref) {
        const size = useComponentSize(props);

        const colorScale = new ColorScale({
            colorPalette: props.colorPalette,
            type: props.discrete ? ColorScaleType.Discrete : ColorScaleType.Continuous,
            gradientType: props.gradientType,
            steps: props.steps,
        });

        if (props.gradientType === ColorScaleGradientType.Diverging) {
            colorScale.setRangeAndMidPoint(props.min, props.max, props.divMidPoint);
        }

        const colorScaleGradientId = makeGradientId(props.id, props.colorPalette);

        return (
            <svg
                ref={ref}
                style={props.layoutStyle}
                className={resolveClassNames(
                    props.layoutClassName,
                    "text-neutral-strong w-full rounded",
                    SIZE_TO_CLASSNAMES[size],
                )}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <GradientDef id={props.id} colorScale={colorScale} />
                </defs>
                <rect height="100%" width="100%" fill={`url(#${colorScaleGradientId})`} stroke="currentColor" />
            </svg>
        );
    },
);

type GradientDefProps = {
    id: string;
    colorScale: ColorScale;
};

function GradientDef(props: GradientDefProps): React.ReactNode {
    const colorStops = props.colorScale.getColorStops();
    const gradientId = makeGradientId(props.id, props.colorScale.getColorPalette());

    return (
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            {colorStops.map((colorStop, index) => (
                <stop key={index} offset={`${(colorStop.offset * 100).toFixed(2)}%`} stopColor={colorStop.color} />
            ))}
        </linearGradient>
    );
}

function makeGradientId(id: string, colorPalette: ColorPalette): string {
    return `${id}-color-scale-gradient-${colorPalette.getId()}`;
}
