import {
    ColorScaleContinuousInterpolationType,
    ColorScaleDiscreteInterpolationType,
    ColorScaleGradientType,
    ColorScaleType,
} from "@framework/WorkbenchSettings";

export type State = {
    type: ColorScaleType;
    gradientType: ColorScaleGradientType;
    steps: number;
    continuousInterpolation: ColorScaleContinuousInterpolationType;
    discreteInterpolation: ColorScaleDiscreteInterpolationType;
};
