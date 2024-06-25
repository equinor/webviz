import { Grid3dGeometry_api, Grid3dMappedProperty_api } from "@api";
import { FenceMeshSection_api, PolylineIntersection_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules_shared/base64";
import { b64DecodeUintArrayToUint32, b64DecodeUintArrayToUint32OrLess } from "@modules_shared/base64";

// Data structure for the transformed GridSurface data
// Removes the base64 encoded data and replaces them with typed arrays
export type GridSurface_trans = Omit<
    Grid3dGeometry_api,
    "points_b64arr" | "polys_b64arr" | "poly_source_cell_indices_b64arr"
> & {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
    polySourceCellIndicesUint32Arr: Uint32Array;
};

export function transformGridSurface(apiData: Grid3dGeometry_api): GridSurface_trans {
    const startTS = performance.now();

    const { points_b64arr, polys_b64arr, poly_source_cell_indices_b64arr, ...untransformedData } = apiData;
    const pointsFloat32Arr = b64DecodeFloatArrayToFloat32(points_b64arr);
    const polysUint32Arr = b64DecodeUintArrayToUint32(polys_b64arr);
    const polySourceCellIndicesUint32Arr = b64DecodeUintArrayToUint32(poly_source_cell_indices_b64arr);

    console.debug(`transformGridSurface() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        pointsFloat32Arr: pointsFloat32Arr,
        polysUint32Arr: polysUint32Arr,
        polySourceCellIndicesUint32Arr: polySourceCellIndicesUint32Arr,
    };
}

export type GridMappedProperty_trans = Omit<Grid3dMappedProperty_api, "poly_props_b64arr"> & {
    polyPropsFloat32Arr: Float32Array;
};

export function transformGridMappedProperty(apiData: Grid3dMappedProperty_api): GridMappedProperty_trans {
    const startTS = performance.now();

    const { poly_props_b64arr, ...untransformedData } = apiData;
    const polyPropsFloat32Arr = b64DecodeFloatArrayToFloat32(poly_props_b64arr);

    console.debug(`transformGridProperty() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        polyPropsFloat32Arr: polyPropsFloat32Arr,
    };
}

export type FenceMeshSection_trans = Omit<
    FenceMeshSection_api,
    | "vertices_uz_b64arr"
    | "poly_indices_b64arr"
    | "vertices_per_poly_b64arr"
    | "poly_source_cell_indices_b64arr"
    | "poly_props_b64arr"
> & {
    verticesUzFloat32Arr: Float32Array;
    polyIndicesUintArr: Uint32Array | Uint16Array | Uint8Array;
    verticesPerPolyUintArr: Uint32Array | Uint16Array | Uint8Array;
    polySourceCellIndicesUint32Arr: Uint32Array;
    polyPropsFloat32Arr: Float32Array;
};

export type PolylineIntersection_trans = Omit<PolylineIntersection_api, "fence_mesh_sections"> & {
    fenceMeshSections: Array<FenceMeshSection_trans>;
};

function transformFenceMeshSection(apiData: FenceMeshSection_api): FenceMeshSection_trans {
    const {
        vertices_uz_b64arr,
        poly_indices_b64arr,
        vertices_per_poly_b64arr,
        poly_source_cell_indices_b64arr,
        poly_props_b64arr,
        ...untransformedData
    } = apiData;

    const verticesUzFloat32Arr = b64DecodeFloatArrayToFloat32(vertices_uz_b64arr);
    const polyIndicesUintArr = b64DecodeUintArrayToUint32OrLess(poly_indices_b64arr);
    const verticesPerPolyUintArr = b64DecodeUintArrayToUint32OrLess(vertices_per_poly_b64arr);
    const polySourceCellIndicesUint32Arr = b64DecodeUintArrayToUint32(poly_source_cell_indices_b64arr);
    const polyPropsFloat32Arr = b64DecodeFloatArrayToFloat32(poly_props_b64arr);

    return {
        ...untransformedData,
        verticesUzFloat32Arr: verticesUzFloat32Arr,
        polyIndicesUintArr: polyIndicesUintArr,
        verticesPerPolyUintArr: verticesPerPolyUintArr,
        polySourceCellIndicesUint32Arr: polySourceCellIndicesUint32Arr,
        polyPropsFloat32Arr: polyPropsFloat32Arr,
    };
}

export function transformPolylineIntersection(apiData: PolylineIntersection_api): PolylineIntersection_trans {
    const startTS = performance.now();

    const { fence_mesh_sections, ...untransformedData } = apiData;

    const transMeshSections: FenceMeshSection_trans[] = [];

    for (const apiSection of fence_mesh_sections) {
        const transformedSection = transformFenceMeshSection(apiSection);
        transMeshSections.push(transformedSection);
    }

    console.debug(`transformPolylineIntersection() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        fenceMeshSections: transMeshSections,
    };
}
