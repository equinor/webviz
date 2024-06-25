import { B64FloatArray_api, B64UintArray_api } from "@api";

export function b64DecodeUintArray(
    base64Arr: B64UintArray_api
): Uint8Array | Uint16Array | Uint32Array | BigUint64Array {
    const arrayBuffer = base64StringToArrayBuffer(base64Arr.data_b64str);
    switch (base64Arr.element_type) {
        case B64UintArray_api.element_type.UINT8:
            return new Uint8Array(arrayBuffer);
        case B64UintArray_api.element_type.UINT16:
            return new Uint16Array(arrayBuffer);
        case B64UintArray_api.element_type.UINT32:
            return new Uint32Array(arrayBuffer);
        case B64UintArray_api.element_type.UINT64:
            return new BigUint64Array(arrayBuffer);
        default:
            throw new Error(`Unknown element_type: ${base64Arr.element_type}`);
    }
}

export function b64DecodeUintArrayToUint32(base64Arr: B64UintArray_api): Uint32Array {
    const typedArray = b64DecodeUintArray(base64Arr);

    // How should we handle this?
    // For now, throw an error to make sure we err on the safe side
    if (typedArray instanceof BigUint64Array) {
        throw new Error(`Cannot convert BigUint64Array to Uint32Array`);
    }

    if (typedArray instanceof Uint32Array) {
        return typedArray;
    } else {
        return new Uint32Array(typedArray);
    }
}

export function b64DecodeUintArrayToUint32OrLess(base64Arr: B64UintArray_api): Uint32Array | Uint16Array | Uint8Array {
    const typedArray = b64DecodeUintArray(base64Arr);

    // How should we handle this?
    // For now, throw an error to make sure we err on the safe side
    if (typedArray instanceof BigUint64Array) {
        throw new Error("Cannot convert BigUint64Array to Uint32Array, Uint16Array or Uint8Array");
    }

    return typedArray;
}

export function b64DecodeFloatArray(base64Arr: B64FloatArray_api): Float32Array | Float64Array {
    const arrayBuffer = base64StringToArrayBuffer(base64Arr.data_b64str);
    switch (base64Arr.element_type) {
        case B64FloatArray_api.element_type.FLOAT32:
            return new Float32Array(arrayBuffer);
        case B64FloatArray_api.element_type.FLOAT64:
            return new Float64Array(arrayBuffer);
        default:
            throw new Error(`Unknown element_type: ${base64Arr.element_type}`);
    }
}

export function b64DecodeFloatArrayToFloat32(base64Arr: B64FloatArray_api): Float32Array {
    const typedArray = b64DecodeFloatArray(base64Arr);
    if (typedArray instanceof Float32Array) {
        return typedArray;
    } else {
        return new Float32Array(typedArray);
    }
}

function base64StringToArrayBuffer(base64Str: string): ArrayBuffer {
    const binString = atob(base64Str);

    const ubyteArr = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        ubyteArr[i] = binString.charCodeAt(i);
    }

    return ubyteArr.buffer;
}
