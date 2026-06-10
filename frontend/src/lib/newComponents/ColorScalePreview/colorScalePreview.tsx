import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ColorGradientProps } from "../ColorGradient/colorGradient";

export type ColorScalePreviewProps = {
    colorPalette: ColorPalette;
    gradientType: ColorScaleGradientType;
    discrete: boolean;
    steps: number;
    min: number;
    max: number;
    divMidPoint: number;
    id: string;
    size?: SelectableSize;
};

const SIZE_TO_CLASSNAMES: Record<NonNullable<ColorGradientProps["size"]>, string> = {
    small: "h-4",
    default: "h-5",
    large: "h-6",
};

export function ColorScalePreview(props: ColorScalePreviewProps): React.ReactNode {
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
            className={resolveClassNames("text-neutral-strong w-full rounded", SIZE_TO_CLASSNAMES[size])}
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <GradientDef id={props.id} colorScale={colorScale} />
            </defs>
            <rect height="100%" width="100%" fill={`url(#${colorScaleGradientId})`} stroke="currentColor" />
        </svg>
    );
}

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
