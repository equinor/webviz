import type { SeismicFenceData_api } from "@api";

import { b64DecodeFloatArrayToFloat32 } from "../base64";

/**
 * The transformed fence data, with the fence traces decoded as a Float32Array.
 *
 * Remove the base64 encoded data and replace with a Float32Array
 */
export type SeismicFenceData_trans = Omit<SeismicFenceData_api, "fence_traces_b64arr"> & {
    fenceTracesFloat32Arr: Float32Array;
};

/**
 * Transform seismic fence data from API to transformed fence data.
 *
 * The transformed fence data is decoded from base64 to a Float32Array.
 */
export function transformSeismicFenceData(apiData: SeismicFenceData_api): SeismicFenceData_trans {
    const { fence_traces_b64arr, ...untransformedData } = apiData;

    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(fence_traces_b64arr);
    return {
        ...untransformedData,
        fenceTracesFloat32Arr: dataFloat32Arr,
    };
}
