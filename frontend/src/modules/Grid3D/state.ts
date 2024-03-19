import { Grid3dBoundingBox_api } from "@api";

export default interface state {
    gridName: string | null;
    boundingBox: Grid3dBoundingBox_api | null;
    parameterName: string | null;
    selectedWellUuids: string[];
    realization: number;
    singleKLayer: number;
    polyLine: number[];
}
