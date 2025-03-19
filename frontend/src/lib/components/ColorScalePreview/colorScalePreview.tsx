import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

export type ColorScalePreviewProps = {
    colorPalette: ColorPalette;
    gradientType: ColorScaleGradientType;
    discrete: boolean;
    steps: number;
    min: number;
    max: number;
    divMidPoint: number;
    id: string;
};

export function ColorScalePreview(props: ColorScalePreviewProps): React.ReactNode {
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
        <svg className="w-full h-5" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <GradientDef id={props.id} colorScale={colorScale} />
            </defs>
            <rect height="1.25rem" width="100%" fill={`url(#${colorScaleGradientId})`} stroke="#555" />
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
