export enum IntersectionType {
    CUSTOM_POLYLINE = "custom-polyline",
    WELLBORE = "wellbore",
}

export type CustomIntersectionPolyline = {
    id: string;
    name: string;
    polyline: number[][];
};

export type GridCellIndexRanges = {
    i: [number, number];
    j: [number, number];
    k: [number, number];
};
