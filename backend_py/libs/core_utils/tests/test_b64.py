import math

from webviz_pkg.core_utils import b64


def test_encode_as_float32() -> None:
    input_list = [1.0, 2.0, 3.0, 4.0]
    b64_arr = b64.b64_encode_float_array_as_float32(input_list)
    assert b64_arr.element_type == "float32"

    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert input_list == decoded_list

def test_encode_as_float64() -> None:
    input_list = [1.0, 2.0, 3.0, 4.0]
    b64_arr = b64.b64_encode_float_array_as_float64(input_list)
    assert b64_arr.element_type == "float64"

    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert input_list == decoded_list

def test_float_array_with_nan() -> None:
    input_list = [0.0, float("nan"), 10.0]
    
    b64_arr = b64.b64_encode_float_array_as_float32(input_list)
    decoded_list = b64.b64_decode_float_array_to_list(b64_arr)
    assert decoded_list[0] == 0.0
    assert math.isnan(decoded_list[1])
    assert decoded_list[2] == 10.0
