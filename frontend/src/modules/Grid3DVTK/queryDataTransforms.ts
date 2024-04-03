import { GridSurfaceVtk_api } from "@api";

import { b64DecodeFloatArrayToFloat32, b64DecodeUintArrayToUint32} from "@modules_shared/base64";

// Data structure for the transformed GridSurface data
// Removes the base64 encoded data and replaces them with typed arrays
export type GridSurfaceVtk_trans = Omit<GridSurfaceVtk_api, "points_b64arr" | "polys_b64arr"> & {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
};

export function transformGridSurface(apiData: GridSurfaceVtk_api): GridSurfaceVtk_trans {
    const startTS = performance.now();

    const { points_b64arr, polys_b64arr, ...untransformedData } = apiData;
    const pointsFloat32Arr = b64DecodeFloatArrayToFloat32(points_b64arr);
    const polysUint32Arr = b64DecodeUintArrayToUint32(polys_b64arr);

    console.debug(`transformGridSurface() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        pointsFloat32Arr: pointsFloat32Arr,
        polysUint32Arr: polysUint32Arr,
    };
}
