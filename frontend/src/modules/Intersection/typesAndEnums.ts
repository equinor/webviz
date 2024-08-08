export const CURVE_FITTING_EPSILON = 5; // meter

export type WellboreHeader = {
    uuid: string;
    identifier: string;
    depthReferencePoint: string;
    depthReferenceElevation: number;
};
