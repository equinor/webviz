import math

import numpy as np

from webviz_pkg.core_utils import b64


def test_encode_as_float32() -> None:
    input_list = [1.0, 2.0, 3.0, 4.0]
    b64_arr = b64.b64_encode_float_array_as_float32(input_list)
    assert b64_arr.element_type == "float32"

    decoded_arr = b64.b64_decode_float_array(b64_arr)
    assert decoded_arr.dtype == np.float32

    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert input_list == decoded_list


def test_encode_as_float64() -> None:
    input_list = [1.0, 2.0, 3.0, 4.0]
    b64_arr = b64.b64_encode_float_array_as_float64(input_list)
    assert b64_arr.element_type == "float64"

    decoded_arr = b64.b64_decode_float_array(b64_arr)
    assert decoded_arr.dtype == np.float64

    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert input_list == decoded_list


def test_float_array_with_nan() -> None:
    input_list = [0.0, float("nan"), 10.0]

    b64_arr = b64.b64_encode_float_array_as_float32(input_list)
    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert decoded_list[0] == 0.0
    assert math.isnan(decoded_list[1])
    assert decoded_list[2] == 10.0


def test_encode_as_int32() -> None:
    input_list = [0, 1, -2147483648, 2147483647]
    b64_arr = b64.b64_encode_int_array_as_int32(input_list)
    assert b64_arr.element_type == "int32"

    decoded_arr = b64.b64_decode_int_array(b64_arr)
    assert decoded_arr.dtype == np.int32

    decoded_list = b64.b64_decode_int_array_to_list(b64_arr)
    assert input_list == decoded_list


def test_encode_int_as_smallest_size() -> None:
    input_list_int8 = [-128, -8, 0, 8, 127]
    input_list_int16 = [-32768, -16, 0, 16, 32767]
    input_list_int32 = [-2147483648, -32, 0, 32, 2147483647]

    b64_arr = b64.b64_encode_int_array_as_smallest_size(input_list_int8)
    assert b64_arr.element_type == "int8"
    decoded_arr = b64.b64_decode_int_array(b64_arr)
    assert decoded_arr.dtype == np.int8
    assert np.array_equal(decoded_arr, input_list_int8)

    b64_arr = b64.b64_encode_int_array_as_smallest_size(input_list_int16)
    assert b64_arr.element_type == "int16"
    decoded_arr = b64.b64_decode_int_array(b64_arr)
    assert decoded_arr.dtype == np.int16
    assert np.array_equal(decoded_arr, input_list_int16)

    b64_arr = b64.b64_encode_int_array_as_smallest_size(input_list_int32)
    assert b64_arr.element_type == "int32"
    decoded_arr = b64.b64_decode_int_array(b64_arr)
    assert decoded_arr.dtype == np.int32
    assert np.array_equal(decoded_arr, input_list_int32)


def test_encode_as_uint32() -> None:
    input_list = [0, 1, 4294967295]
    b64_arr = b64.b64_encode_uint_array_as_uint32(input_list)
    assert b64_arr.element_type == "uint32"

    decoded_arr = b64.b64_decode_uint_array(b64_arr)
    assert decoded_arr.dtype == np.uint32
    assert np.array_equal(decoded_arr, input_list)


def test_encode_uint_as_smallest_size() -> None:
    input_list_uint8 = [0, 8, 255]
    input_list_uint16 = [0, 16, 65535]
    input_list_uint32 = [0, 32, 4294967295]
    input_list_uint64 = [0, 32, 18446744073709551615]

    b64_arr = b64.b64_encode_uint_array_as_smallest_size(input_list_uint8)
    assert b64_arr.element_type == "uint8"
    decoded_arr = b64.b64_decode_uint_array(b64_arr)
    assert decoded_arr.dtype == np.uint8
    assert np.array_equal(decoded_arr, input_list_uint8)

    b64_arr = b64.b64_encode_uint_array_as_smallest_size(input_list_uint16)
    assert b64_arr.element_type == "uint16"
    decoded_arr = b64.b64_decode_uint_array(b64_arr)
    assert decoded_arr.dtype == np.uint16
    assert np.array_equal(decoded_arr, input_list_uint16)

    b64_arr = b64.b64_encode_uint_array_as_smallest_size(input_list_uint32)
    assert b64_arr.element_type == "uint32"
    decoded_arr = b64.b64_decode_uint_array(b64_arr)
    assert decoded_arr.dtype == np.uint32
    assert np.array_equal(decoded_arr, input_list_uint32)

    b64_arr = b64.b64_encode_uint_array_as_smallest_size(input_list_uint64)
    assert b64_arr.element_type == "uint64"
    decoded_arr = b64.b64_decode_uint_array(b64_arr)
    assert decoded_arr.dtype == np.uint64
    assert np.array_equal(decoded_arr, input_list_uint64)
