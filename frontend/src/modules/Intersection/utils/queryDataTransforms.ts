import { SeismicFenceData_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules_shared/base64";

// Data structure for transformed data
// Remove the base64 encoded data and replace with a Float32Array
export type SeismicFenceData_trans = Omit<SeismicFenceData_api, "fence_traces_b64arr"> & {
    fenceTracesFloat32Arr: Float32Array;
};

export function transformSeismicFenceData(apiData: SeismicFenceData_api): SeismicFenceData_trans {
    const startTS = performance.now();

    const { fence_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(fence_traces_b64arr);

    console.debug(`transformSurfaceData() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        fenceTracesFloat32Arr: dataFloat32Arr,
    };
}
