export type WebworkerParameters = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
    numSamplesU: number;
    numSamplesV: number;
    boundingBox: number[][];
    zIncreasingDownwards: boolean;
};

export type WebworkerResult = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
};
