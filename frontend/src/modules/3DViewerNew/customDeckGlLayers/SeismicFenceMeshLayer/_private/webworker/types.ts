export type WebWorkerParameters = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
    numSamples: number;
    minDepth: number;
    maxDepth: number;
    traceXYPointsArray: Float32Array;
    zIncreasingDownwards: boolean;
};

export type WebworkerResult = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
};
