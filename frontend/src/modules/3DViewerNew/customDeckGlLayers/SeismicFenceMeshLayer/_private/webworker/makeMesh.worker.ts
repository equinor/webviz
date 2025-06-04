import { expose } from "comlink";

import type { WebWorkerParameters } from "./types";
import * as vec3 from "@lib/utils/vec3";

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

    const numTraces = traceXYZPointsArray.length / 2;

    if (!Number.isInteger(numTraces)) {
        throw new Error("traceXYPointsArray must contain an even number of elements (pairs of XY).");
    }

    const zSign = zIncreasingDownwards ? -1 : 1;
    const stepV = 1.0 / (numSamples - 1);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (let v = 0; v < numSamples; v++) {
        const vec = vec3.scale(vec3.fromArray(vVector), stepV * v);

        for (let u = 0; u < numTraces; u++) {
            const x = traceXYZPointsArray[u * 3] + vec.x;
            const y = traceXYZPointsArray[u * 3 + 1] + vec.y;
            const z = (traceXYZPointsArray[u * 3 + 2] + vec.z) * zSign;

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
