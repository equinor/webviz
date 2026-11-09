// import type { Position } from "@deck.gl/core";

import type { Position } from "@deck.gl/core";

import { FACE_CORNERS, type FaceData, type Faces } from "./types";

export function flattenFaceData<TData>(faceData: FaceData<TData>) {
    return [faceData["I"], faceData["J"], faceData["K"], faceData["-I"], faceData["-J"], faceData["-K"]];
}

export function makeFaceData<TData>(initValue: TData): FaceData<TData> {
    return {
        I: initValue,
        J: initValue,
        K: initValue,
        "-I": initValue,
        "-J": initValue,
        "-K": initValue,
    };
}

export function mapFaceData<TDataOut, TDataIn>(
    face: FaceData<TDataIn>,
    func: (data: TDataIn, face: Faces) => TDataOut,
): FaceData<TDataOut> {
    return {
        I: func(face.I, "I"),
        J: func(face.J, "J"),
        K: func(face.K, "K"),
        "-I": func(face["-I"], "-I"),
        "-J": func(face["-J"], "-J"),
        "-K": func(face["-K"], "-K"),
    };
}

export function mergeFaceData<TData1, TData2, TData3>(
    face1: FaceData<TData1>,
    face2: FaceData<TData2>,
    func: (data1: TData1, data2: TData2, face: Faces) => TData3,
): FaceData<TData3> {
    return {
        I: func(face1.I, face2.I, "I"),
        J: func(face1.J, face2.J, "J"),
        K: func(face1.K, face2.K, "K"),
        "-I": func(face1["-I"], face2["-I"], "-I"),
        "-J": func(face1["-J"], face2["-J"], "-J"),
        "-K": func(face1["-K"], face2["-K"], "-K"),
    };
}

export function getFaceCenter(corners: Position[], face: Faces): Position {
    const faceCornerIndices = FACE_CORNERS[face];
    const center: [number, number, number] = [0, 0, 0];

    for (const cornerIndex of faceCornerIndices) {
        const corner = corners[cornerIndex];
        center[0] += corner[0];
        center[1] += corner[1];
        center[2] += corner[2] ?? 0;
    }

    center[0] /= faceCornerIndices.length;
    center[1] /= faceCornerIndices.length;
    center[2] /= faceCornerIndices.length;

    return center as Position;
}
