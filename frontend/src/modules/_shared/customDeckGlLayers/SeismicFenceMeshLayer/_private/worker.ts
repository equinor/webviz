export enum Space {
    FENCE = "FENCE",
    LAYER = "LAYER",
}

export type WebworkerParameters = {
    offset: [number, number, number];
    sharedVerticesBuffer: SharedArrayBuffer;
    sharedIndicesBuffer: SharedArrayBuffer;
    startVerticesIndex: number;
    startIndicesIndex: number;
    numSamplesU: number;
    numSamplesV: number;
    boundingBox: number[][];
    zIncreasingDownwards: boolean;
};

export function makeMesh(parameters: WebworkerParameters) {
    const bbox = parameters.boundingBox;

    const vectorV = [bbox[1][0] - bbox[0][0], bbox[1][1] - bbox[0][1], bbox[1][2] - bbox[0][2]];
    const vectorU = [bbox[2][0] - bbox[0][0], bbox[2][1] - bbox[0][1], bbox[2][2] - bbox[0][2]];

    function transformUVToXYZ(u: number, v: number): [number, number, number] {
        const x = parameters.offset[0] + u * vectorU[0] + v * vectorV[0];
        const y = parameters.offset[1] + u * vectorU[1] + v * vectorV[1];
        const z = parameters.offset[2] + (parameters.zIncreasingDownwards ? -1 : 1) * (v * vectorV[2] + u * vectorU[2]);
        return [x, y, z];
    }

    const verticesArray = new Float32Array(parameters.sharedVerticesBuffer);
    const indicesArray = new Uint32Array(parameters.sharedIndicesBuffer);

    const stepU = 1.0 / (parameters.numSamplesU - 1);
    const stepV = 1.0 / (parameters.numSamplesV - 1);

    let verticesIndex = parameters.startVerticesIndex;
    let indicesIndex = parameters.startIndicesIndex;

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
}
