import base64
from typing import Literal
from pydantic import BaseModel

import numpy as np
from numpy.typing import NDArray


class B64FloatArray(BaseModel):
    element_type: Literal["float32", "float64"]
    data_b64str: str


class B64UintArray(BaseModel):
    element_type: Literal["uint16", "uint32", "uint64"]
    data_b64str: str


class B64IntArray(BaseModel):
    element_type: Literal["int16", "int32"]
    data_b64str: str


# class B64TypedArray(BaseModel):
#     element_type: Literal["float32", "float64", "uint16", "uint32", "uint64", "int16", "int32"]
#     data_b64str: str


def b64_encode_float_array_as_float32(input_arr: NDArray[np.floating] | list[float]) -> B64FloatArray:
    """
    Base64 encodes an array of floating point numbers using 32bit float element size.
    """
    np_arr: NDArray[np.float32] = np.asarray(input_arr, dtype=np.float32)
    base64_str = _base64_encode_numpy_arr_to_str(np_arr)
    return B64FloatArray(element_type="float32", data_b64str=base64_str)


def b64_encode_float_array_as_float64(input_arr: NDArray[np.floating] | list[float]) -> B64FloatArray:
    """
    Base64 encodes array of floating point numbers using 64bit float element size.
    """
    np_arr: NDArray[np.float64] = np.asarray(input_arr, dtype=np.float64)
    base64_str = _base64_encode_numpy_arr_to_str(np_arr)
    return B64FloatArray(element_type="float64", data_b64str=base64_str)


def b64_encode_int_array_as_int32(input_arr: NDArray[np.integer] | list[int]) -> B64IntArray:
    """
    Base64 encodes an array of signed integers as using 32bit int element size.
    """
    np_arr: NDArray[np.int32] = np.asarray(input_arr, dtype=np.int32)
    base64_str = _base64_encode_numpy_arr_to_str(np_arr)
    return B64IntArray(element_type="int32", data_b64str=base64_str)


def b64_encode_uint_array_as_uint32(input_arr: NDArray[np.unsignedinteger] | list[int]) -> B64UintArray:
    """
    Base64 encodes an array of unsigned integers using 32bit uint element size.
    """
    np_arr: NDArray[np.uint32] = np.asarray(input_arr, dtype=np.uint32)
    base64_str = _base64_encode_numpy_arr_to_str(np_arr)
    return B64UintArray(element_type="uint32", data_b64str=base64_str)


def b64_encode_uint_array_as_smallest_size(
    input_arr: NDArray[np.unsignedinteger] | list[int], max_value: int | None = None
) -> B64UintArray:
    """
    Base64 encodes an array of unsigned integers using the smallest possible element size.
    If the maximum value in the array is known, it can be specified in the max_value parameter.
    """
    if max_value is None:
        max_value = np.amax(input_arr)

    element_type: Literal["uint16", "uint32", "uint64"]

    if max_value <= np.iinfo(np.uint16).max:
        np_arr = np.asarray(input_arr, dtype=np.uint16)
        element_type = "uint16"
    elif max_value <= np.iinfo(np.uint32).max:
        np_arr = np.asarray(input_arr, dtype=np.uint32)
        element_type = "uint32"
    else:
        np_arr = np.asarray(input_arr, dtype=np.uint64)
        element_type = "uint64"

    base64_str = _base64_encode_numpy_arr_to_str(np_arr)

    return B64UintArray(element_type=element_type, data_b64str=base64_str)


def _base64_encode_numpy_arr_to_str(np_arr: NDArray) -> str:
    base64_bytes: bytes = base64.b64encode(np_arr.ravel(order="C").data)
    return base64_bytes.decode("ascii")
