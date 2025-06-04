import { expose } from "comlink";

import type { WebWorkerParameters } from "./types";

/**
 * Generates a mesh for a seismic fence based on an array of XY points and a vertical sampling range.
 * @param parameters The parameters for generating the mesh:
 * - verticesArray: The Float32Array to be filled with vertex positions (x, y, z)
 * - indicesArray: The Uint32Array to be filled with triangle indices
 * - numSamples: The number of vertical samples (depth levels)
 * - vVector: A 3D vector representing the vertical direction
 * - traceXYPointsArray: A flat Float32Array of XY coordinate pairs representing the fence trace
 * - zIncreasingDownwards: Whether the Z axis increases downwards (true for depth-based systems)
 */
function makeMesh(parameters: WebWorkerParameters) {
    const { verticesArray, indicesArray, numSamples, vVector, origin, traceXYPointsArray, zIncreasingDownwards } =
        parameters;

    const numTraces = traceXYPointsArray.length / 2;

    if (!Number.isInteger(numTraces)) {
        throw new Error("traceXYPointsArray must contain an even number of elements (pairs of XY).");
    }

    const zSign = zIncreasingDownwards ? -1 : 1;
    const stepV = 1.0 / (numSamples - 1);
    const vRange = vVector[2];

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let v = 0; v < numSamples; v++) {
        const depth = origin[2] + v * stepV * vRange * zSign;

        for (let u = 0; u < numTraces; u++) {
            const x = traceXYPointsArray[u * 2];
            const y = traceXYPointsArray[u * 2 + 1];
            const z = depth;

            verticesArray[vertexIndex++] = x;
            verticesArray[vertexIndex++] = y;
            verticesArray[vertexIndex++] = z;

            if (u > 0 && v > 0) {
                const rowStride = numTraces;
                const i00 = (v - 1) * rowStride + (u - 1);
                const i01 = (v - 1) * rowStride + u;
                const i10 = v * rowStride + (u - 1);
                const i11 = v * rowStride + u;

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
