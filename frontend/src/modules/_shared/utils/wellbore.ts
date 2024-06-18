import { FenceMeshSection_api, PolylineIntersection_api } from "@api";
import { arrayPointToPoint2D, pointDistance } from "@lib/utils/geometry";

import simplify from "simplify-js";

import { b64DecodeFloatArrayToFloat32, b64DecodeUintArrayToUint32, b64DecodeUintArrayToUint32OrLess } from "../base64";

function normalizeVector(vector: number[]): number[] {
    const vectorLength = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
    return [vector[0] / vectorLength, vector[1] / vectorLength];
}

export type SimplifiedWellboreTrajectoryInXyPlaneResult = {
    simplifiedWellboreTrajectoryXy: number[][];
    actualSectionLengths: number[];
};

/*
    Calculates a simplified version of the wellbore trajectory in the XY plane by using the Ramer-Douglas-Peucker algorithm.
    Can also extend the trajectory by a specified length in the direction of the first and last non-zero vectors.
    If the wellbore is completely vertical, the trajectory will be extended in the x-direction.
*/
export function calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
    wellboreTrajectory: number[][],
    extensionLength: number = 0,
    epsilon: number = 0.1
): SimplifiedWellboreTrajectoryInXyPlaneResult {
    const simplifiedTrajectoryXy: number[][] = [];
    const actualSectionLengths: number[] = [];

    const adjustedWellboreTrajectory = wellboreTrajectory.map((point) => ({ x: point[0], y: point[1] }));

    const simplifiedCurve = simplify(adjustedWellboreTrajectory, epsilon).map((point) => [point.x, point.y]);

    let lastWellboreTrajectoryIndex = 0;
    for (const [index, point] of simplifiedCurve.entries()) {
        simplifiedTrajectoryXy.push([point[0], point[1]]);

        if (index === 0) {
            continue;
        }

        let sectionLength = 0;
        for (let i = lastWellboreTrajectoryIndex + 1; i < wellboreTrajectory.length; i++) {
            sectionLength += pointDistance(
                arrayPointToPoint2D(wellboreTrajectory[i]),
                arrayPointToPoint2D(wellboreTrajectory[i - 1])
            );

            if (wellboreTrajectory[i][0] === point[0] && wellboreTrajectory[i][1] === point[1]) {
                actualSectionLengths.push(sectionLength);
                lastWellboreTrajectoryIndex = i;
                break;
            }
        }
    }

    if (extensionLength > 0) {
        const vectorEndPoint = simplifiedCurve[simplifiedCurve.length - 1];
        let vectorStartPoint = vectorEndPoint;
        for (let i = simplifiedCurve.length - 2; i >= 0; i--) {
            if (simplifiedCurve[i][0] !== vectorEndPoint[0] || simplifiedCurve[i][1] !== vectorEndPoint[1]) {
                vectorStartPoint = simplifiedCurve[i];
                break;
            }
        }

        const vector = [vectorEndPoint[0] - vectorStartPoint[0], vectorEndPoint[1] - vectorStartPoint[1]];

        if (vector[0] === 0 && vector[1] === 0) {
            vector[0] = 1;
        }

        const normalizedVector = normalizeVector(vector);

        const extendedFirstPoint = [
            simplifiedCurve[0][0] - normalizedVector[0] * extensionLength,
            simplifiedCurve[0][1] - normalizedVector[1] * extensionLength,
        ];
        const extendedLastPoint = [
            simplifiedCurve[simplifiedCurve.length - 1][0] + normalizedVector[0] * extensionLength,
            simplifiedCurve[simplifiedCurve.length - 1][1] + normalizedVector[1] * extensionLength,
        ];

        simplifiedTrajectoryXy.unshift(extendedFirstPoint);
        simplifiedTrajectoryXy.push(extendedLastPoint);

        actualSectionLengths.unshift(
            pointDistance(arrayPointToPoint2D(extendedFirstPoint), arrayPointToPoint2D(simplifiedCurve[0]))
        );
        actualSectionLengths.push(
            pointDistance(
                arrayPointToPoint2D(extendedLastPoint),
                arrayPointToPoint2D(simplifiedCurve[simplifiedCurve.length - 1])
            )
        );
    }

    return {
        simplifiedWellboreTrajectoryXy: simplifiedTrajectoryXy,
        actualSectionLengths,
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

export function transformPolylineIntersectionResult(
    polylineIntersection: PolylineIntersection_trans,
    actualSectionLengths: number[]
): AdjustedPolylineIntersection {
    const fenceMeshSections: AdjustedFenceMeshSection[] = [];

    // Section with a length of 0 are not included in the results - remove
    const adjustedActualSectionLengths = actualSectionLengths.filter((length) => length > 0);

    for (const [index, section] of polylineIntersection.fenceMeshSections.entries()) {
        const actualSectionLength = adjustedActualSectionLengths[index];
        const simplifiedSectionLength = pointDistance(
            {
                x: section.start_utm_x,
                y: section.start_utm_y,
            },
            {
                x: section.end_utm_x,
                y: section.end_utm_y,
            }
        );

        const scale = actualSectionLength / simplifiedSectionLength;

        let minZ = Number.MAX_VALUE;
        let maxZ = Number.MIN_VALUE;
        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
            section.verticesUzFloat32Arr[i] *= scale;
            section.verticesUzFloat32Arr[i + 1] *= -1;
            minZ = Math.min(minZ, section.verticesUzFloat32Arr[i + 1]);
            maxZ = Math.max(maxZ, section.verticesUzFloat32Arr[i + 1]);
        }

        fenceMeshSections.push({
            ...section,
            sectionLength: actualSectionLength,
            minZ,
            maxZ,
        });
    }

    return {
        ...polylineIntersection,
        fenceMeshSections,
    };
}
