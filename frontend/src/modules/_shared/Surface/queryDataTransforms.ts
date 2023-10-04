import { SurfaceData_api } from "@api";

import { b64DecodeFloatArrayToFloat32 } from "@modules_shared/base64";

// Data structure for transformed data
// Remove the base64 encoded data and replace with a Float32Array
export type SurfaceData_trans = Omit<SurfaceData_api, "values_b64arr"> & {
    valuesFloat32Arr: Float32Array;
};

export function transformSurfaceData(apiData: SurfaceData_api): SurfaceData_trans {
    const startTS = performance.now();

    const { values_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(values_b64arr);

    console.debug(`transformSurfaceData() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        valuesFloat32Arr: dataFloat32Arr,
    };
}
