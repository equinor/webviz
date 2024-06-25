export enum LayerType {
    GRID = "grid",
    SEISMIC = "seismic",
    SURFACES = "surfaces",
    WELLPICKS = "wellpicks",
    SURFACES_UNCERTAINTY = "surfaces-uncertainty",
}

export const LAYER_TYPE_TO_STRING_MAPPING = {
    [LayerType.GRID]: "Grid",
    [LayerType.SEISMIC]: "Seismic",
    [LayerType.SURFACES]: "Surfaces",
    [LayerType.WELLPICKS]: "Wellpicks",
    [LayerType.SURFACES_UNCERTAINTY]: "Surfaces Uncertainty",
};
