import workerpool from "workerpool";

export enum Space {
    FENCE = "FENCE",
    LAYER = "LAYER",
}

export type WebworkerParameters = {
    transVertices: Float32Array;
    transIndices: Uint32Array;
    startVerticesIndex: number;
    startIndicesIndex: number;
    numSamplesU: number;
    numSamplesV: number;
    boundingBox: number[][];
    space: Space;
};

export type WebworkerResult = {
    vertices: Float32Array;
    indices: Uint32Array;
    outlineIndices: Uint32Array;
};

export function makeMesh(parameters: WebworkerParameters): WebworkerResult {
    let transformUVToXYZ: (u: number, v: number) => [number, number, number] = () => {
        throw new Error("transformUVToXYZ not implemented");
    };

    if (parameters.space === Space.FENCE) {
        transformUVToXYZ = (u: number, v: number): [number, number, number] => {
            const x = v * (bbox[1][0] - bbox[0][0]);
            const y = v * (bbox[1][1] - bbox[0][1]);
            const z = -(u * (data.u_max - data.u_min));
            return [x, y, z];
        };
    }
}

workerpool.worker({
    makeMesh,
});
