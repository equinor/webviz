import { cloneDeep } from "lodash";

import type { FenceMeshSection_api, PolylineIntersection_api } from "@api";
import { point2Distance } from "@lib/utils/vec2";


import { b64DecodeFloatArrayToFloat32, b64DecodeUintArrayToUint32, b64DecodeUintArrayToUint32OrLess } from "../base64";

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
    const { fence_mesh_sections, ...untransformedData } = apiData;

    const transMeshSections: FenceMeshSection_trans[] = [];

    for (const apiSection of fence_mesh_sections) {
        const transformedSection = transformFenceMeshSection(apiSection);
        transMeshSections.push(transformedSection);
    }

    return {
        ...untransformedData,
        fenceMeshSections: transMeshSections,
    };
}

export type AdjustedFenceMeshSection = FenceMeshSection_trans & {
    sectionLength: number;
    minZ: number;
    maxZ: number;
};

export type AdjustedPolylineIntersection = Omit<PolylineIntersection_trans, "fenceMeshSections"> & {
    fenceMeshSections: AdjustedFenceMeshSection[];
};

/**
 * Transform the intersection result to include the actual section lengths, and invert the z values from
 * negative to positive values.
 */
export function createTransformedPolylineIntersectionResult(
    polylineIntersection: PolylineIntersection_trans,
    actualSectionLengths: number[],
): AdjustedPolylineIntersection {
    // Section with a length of 0 are not included in the results - remove
    const adjustedActualSectionLengths = actualSectionLengths.filter((length) => length > 0);

    if (adjustedActualSectionLengths.length < polylineIntersection.fenceMeshSections.length) {
        throw new Error("Adjusted actual section lengths are less than the number of fence mesh sections");
    }

    const adjustedFenceMeshSections: AdjustedFenceMeshSection[] = [];
    for (const [index, section] of polylineIntersection.fenceMeshSections.entries()) {
        // TODO: Use a deep clone to avoid modifying the original data, resolve this in a better way
        const clonedSection = cloneDeep(section);

        const actualSectionLength = adjustedActualSectionLengths[index];
        const simplifiedSectionLength = point2Distance(
            {
                x: section.start_utm_x,
                y: section.start_utm_y,
            },
            {
                x: section.end_utm_x,
                y: section.end_utm_y,
            },
        );

        const scale = actualSectionLength / simplifiedSectionLength;

        let minZ = Number.MAX_VALUE;
        let maxZ = Number.MIN_VALUE;
        for (let i = 0; i < clonedSection.verticesUzFloat32Arr.length; i += 2) {
            clonedSection.verticesUzFloat32Arr[i] *= scale;
            clonedSection.verticesUzFloat32Arr[i + 1] *= -1;
            minZ = Math.min(minZ, clonedSection.verticesUzFloat32Arr[i + 1]);
            maxZ = Math.max(maxZ, clonedSection.verticesUzFloat32Arr[i + 1]);
        }

        adjustedFenceMeshSections.push({
            ...clonedSection,
            sectionLength: actualSectionLength,
            minZ,
            maxZ,
        });
    }

    return {
        ...polylineIntersection,
        fenceMeshSections: adjustedFenceMeshSections,
    };
}
