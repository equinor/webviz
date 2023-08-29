import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

export type State = {
    type: ColorScaleType;
    gradientType: ColorScaleGradientType;
    min: number;
    max: number;
    divMidPoint: number;
};
