import type { SeismicSliceData_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";

export type SeismicSliceData_trans = Omit<SeismicSliceData_api, "slice_traces_b64arr"> & {
    dataFloat32Arr: Float32Array;
};

export function transformSeismicSlice(apiData: SeismicSliceData_api): SeismicSliceData_trans {
    const startTS = performance.now();

    const { slice_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(slice_traces_b64arr);

    console.debug(`transformSeismicSlice() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        dataFloat32Arr: dataFloat32Arr,
    };
}
