import { expose } from "comlink";

import * as vec3 from "@lib/utils/vec3";

import type { WebWorkerParameters } from "./types";

/**
 * Generates a mesh for a seismic fence based on an array of XY points and a vertical sampling range.
 * @param parameters The parameters for generating the mesh:
 * - verticesArray: The Float32Array to be filled with vertex positions (x, y, z)
 * - indicesArray: The Uint32Array to be filled with triangle indices
 * - numSamples: The number of vertical samples (depth levels)
 * - origin: The origin point in 3D space (x, y, z)
 * - vVector: A 3D vector representing the vertical direction
 * - traceXYPointsArray: A flat Float32Array of XY coordinate pairs representing the fence trace
 * - zIncreasingDownwards: Whether the Z axis increases downwards (true for depth-based systems)
 */
function makeMesh(parameters: WebWorkerParameters) {
    const { verticesArray, indicesArray, numSamples, vVector, traceXYZPointsArray, zIncreasingDownwards } = parameters;

    const numTraces = traceXYZPointsArray.length / 3;

    if (!Number.isInteger(numTraces)) {
        throw new Error("traceXYZPointsArray must contain a multiple of 3 elements ([x, y, z] triplets).");
    }

    const zSign = zIncreasingDownwards ? -1 : 1;
    const stepV = 1.0 / (numSamples - 1);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let u = 0; u < numTraces; u++) {
        for (let v = 0; v < numSamples; v++) {
            const vec = vec3.scale(vec3.fromArray(vVector), stepV * v);

            const index = u * 3;
            const x = traceXYZPointsArray[index] + vec.x;
            const y = traceXYZPointsArray[index + 1] + vec.y;
            const z = (traceXYZPointsArray[index + 2] + vec.z) * zSign;

            verticesArray[vertexIndex++] = x;
            verticesArray[vertexIndex++] = y;
            verticesArray[vertexIndex++] = z;

            if (u > 0 && v > 0) {
                const rowStride = numSamples;
                const i00 = (u - 1) * rowStride + (v - 1);
                const i01 = u * rowStride + (v - 1);
                const i10 = (u - 1) * rowStride + v;
                const i11 = u * rowStride + v;

                indicesArray[indexIndex++] = i00;
                indicesArray[indexIndex++] = i01;
                indicesArray[indexIndex++] = i10;

                indicesArray[indexIndex++] = i10;
                indicesArray[indexIndex++] = i01;
                indicesArray[indexIndex++] = i11;
            }
        }
    }

    return {
        verticesArray,
        indicesArray,
    };
}

expose({ makeMesh });
