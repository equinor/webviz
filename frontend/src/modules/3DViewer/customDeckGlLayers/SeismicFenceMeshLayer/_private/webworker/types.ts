export type WebWorkerParameters = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
    numSamples: number;
    vVector: [number, number, number];
    traceXYZPointsArray: Float32Array;
    zIncreasingDownwards: boolean;
};

export type WebworkerResult = {
    verticesArray: Float32Array;
    indicesArray: Uint32Array;
};
