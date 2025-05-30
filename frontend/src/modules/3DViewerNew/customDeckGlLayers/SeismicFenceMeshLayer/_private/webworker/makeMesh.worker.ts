import { expose } from "comlink";

import type { WebworkerParameters } from "./types";

/*
Generates a mesh for a seismic fence.
@param parameters The parameters for generating the mesh
- offset: The offset of the mesh
- verticesArray: The Float32Array for the vertices transferred from the main thread
- indicesArray: The Uint32Array for the indices transferred from the main thread
- numSamplesU: The number of samples in the U direction
- numSamplesV: The number of samples in the V direction
- boundingBox: The bounding box of the mesh - used to transform UV coordinates to XYZ coordinates
- zIncreasingDownwards: Whether the Z axis increases downwards

*/
function makeMesh(parameters: WebworkerParameters) {
    const bbox = parameters.boundingBox;

    const vectorV = [bbox[1][0] - bbox[0][0], bbox[1][1] - bbox[0][1], bbox[1][2] - bbox[0][2]];
    const vectorU = [bbox[2][0] - bbox[0][0], bbox[2][1] - bbox[0][1], bbox[2][2] - bbox[0][2]];

    function transformUVToXYZ(u: number, v: number): [number, number, number] {
        const x = u * vectorU[0] + v * vectorV[0];
        const y = u * vectorU[1] + v * vectorV[1];
        const z = (parameters.zIncreasingDownwards ? -1 : 1) * (v * vectorV[2] + u * vectorU[2]);
        return [x, y, z];
    }

    const verticesArray = new Float32Array(parameters.verticesArray);
    const indicesArray = new Uint32Array(parameters.indicesArray);

    const stepU = 1.0 / (parameters.numSamplesU - 1);
    const stepV = 1.0 / (parameters.numSamplesV - 1);

    let verticesIndex = 0;
    let indicesIndex = 0;

    for (let v = 0; v < parameters.numSamplesV; v++) {
        for (let u = 0; u < parameters.numSamplesU; u++) {
            const [x, y, z] = transformUVToXYZ(u * stepU, v * stepV);
            verticesArray[verticesIndex++] = x;
            verticesArray[verticesIndex++] = y;
            verticesArray[verticesIndex++] = z;

            if (u > 0 && v > 0) {
                indicesArray[indicesIndex++] = (v - 1) * parameters.numSamplesU + u - 1;
                indicesArray[indicesIndex++] = (v - 1) * parameters.numSamplesU + u;
                indicesArray[indicesIndex++] = v * parameters.numSamplesU + u - 1;

                indicesArray[indicesIndex++] = v * parameters.numSamplesU + u - 1;
                indicesArray[indicesIndex++] = (v - 1) * parameters.numSamplesU + u;
                indicesArray[indicesIndex++] = v * parameters.numSamplesU + u;
            }
        }
    }

    return {
        verticesArray,
        indicesArray,
    };
}

expose({ makeMesh });
