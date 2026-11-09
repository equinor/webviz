export type GridCell = {
    index: number;
    /* 
        Corner positions, in order as:
        TODO
    */
    corners: number[][];

    /* Ordered as: x, y, z, -x, -y, -z */
    faceVelocities: number[][];
    /** Neighboring cells, ordered as: x, y, z, -x, -y, -z */
    neighborIndices: FaceData<number>;
};

export const FACES = ["I", "J", "K", "-I", "-J", "-K"] as const;
export type Faces = (typeof FACES)[number];

export type FaceData<TData> = {
    [K in Faces]: TData;
};

export const FACE_VELOCITY_VECTOR: FaceData<[number, number, number]> = {
    I: [1, 0, 0],
    J: [0, 1, 0],
    K: [0, 0, 1],
    "-I": [-1, 0, 0],
    "-J": [0, -1, 0],
    "-K": [0, 0, -1],
};

export const FACE_CORNERS: FaceData<[number, number, number, number]> = {
    I: [1, 5, 7, 3],
    J: [2, 6, 7, 3],
    K: [4, 5, 7, 6],
    "-I": [0, 4, 6, 2],
    "-J": [0, 4, 5, 1],
    "-K": [0, 1, 3, 2],
};
