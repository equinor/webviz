import { SurfaceDataFloat_api } from "@api";
import { SurfaceDataPng_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules_shared/base64";

// Data structure for transformed data
// Remove the base64 encoded data and replace with a Float32Array
export type SurfaceDataFloat_trans = Omit<SurfaceDataFloat_api, "values_b64arr"> & {
    valuesFloat32Arr: Float32Array;
};

export function transformSurfaceData(
    apiData: SurfaceDataFloat_api | SurfaceDataPng_api
): SurfaceDataFloat_trans | SurfaceDataPng_api {
    const startTS = performance.now();

    if ("values_b64arr" in apiData) {
        const { values_b64arr, ...untransformedData } = apiData;
        const dataFloat32Arr = b64DecodeFloatArrayToFloat32(values_b64arr);

        console.debug(`transformSurfaceData() took: ${(performance.now() - startTS).toFixed(1)}ms`);

        return {
            ...untransformedData,
            valuesFloat32Arr: dataFloat32Arr,
        };
    }

    // No transformation needed for PNG
    return apiData;
}
