import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { SurfaceSpecification } from "./types";

export const defaultState: State = {
    surfaceSpecifications: [],
    colorScaleGradientType: ColorScaleGradientType.Sequential,
};
export type State = { surfaceSpecifications: SurfaceSpecification[]; colorScaleGradientType: ColorScaleGradientType };
