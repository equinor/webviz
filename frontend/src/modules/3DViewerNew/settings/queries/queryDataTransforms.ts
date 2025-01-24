import { SeismicCrosslineData_api, SeismicInlineData_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";

export type SeismicInlineData_trans = Omit<SeismicInlineData_api, "slice_traces_b64arr"> & {
    dataFloat32Arr: Float32Array;
};

export function transformSeismicInline(apiData: SeismicInlineData_api): SeismicInlineData_trans {
    const startTS = performance.now();

    const { slice_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(slice_traces_b64arr);

    console.debug(`transformSeismicInline() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        dataFloat32Arr: dataFloat32Arr,
    };
}

export type SeismicCrosslineData_trans = Omit<SeismicCrosslineData_api, "slice_traces_b64arr"> & {
    dataFloat32Arr: Float32Array;
};

export function transformSeismicCrossline(apiData: SeismicCrosslineData_api): SeismicCrosslineData_trans {
    const startTS = performance.now();

    const { slice_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(slice_traces_b64arr);

    console.debug(`transformSeismicCrossline() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        dataFloat32Arr: dataFloat32Arr,
    };
}
