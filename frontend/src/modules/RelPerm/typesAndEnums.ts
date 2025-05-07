export enum ColorBy {
    ENSEMBLE = "ensemble",
    CURVE = "curve",
    SATNUM = "satnum",
}

export const COLOR_BY_TO_DISPLAY_NAME: Record<ColorBy, string> = {
    [ColorBy.ENSEMBLE]: "Ensemble",
    [ColorBy.CURVE]: "Curve",
    [ColorBy.SATNUM]: "Satnum",
};
