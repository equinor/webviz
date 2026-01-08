import type { SurfaceDataPng_api } from "@api";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";

export enum SurfaceDataFormat {
    FLOAT = "float",
    PNG = "png",
}
export type SurfaceData =
    | { format: SurfaceDataFormat.FLOAT; surfaceData: SurfaceDataFloat_trans }
    | { format: SurfaceDataFormat.PNG; surfaceData: SurfaceDataPng_api };

export type SurfaceStoredData = {
    realizations: readonly number[];
    realizationMode: string;
};
