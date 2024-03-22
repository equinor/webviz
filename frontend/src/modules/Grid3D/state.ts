import { BoundingBox3d_api } from "@api";

export type Point = { x: number; y: number };
export default interface state {
    gridName: string | null;
    boundingBox: BoundingBox3d_api | null;
    parameterName: string | null;
    selectedWellUuids: string[];
    showGridLines: boolean;
    realization: number;
    singleKLayer: number;
    polyLine: Point[];
}
