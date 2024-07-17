from primary.utils.query_string_utils import decode_key_val_str
from primary.utils.query_string_utils import encode_as_uint_list_str, decode_uint_list_str


def test_decode_key_val_str_with_empty_input() -> None:
    assert decode_key_val_str("") == {}
    assert decode_key_val_str(" ") == {}
    assert decode_key_val_str("~~") == {}
    assert decode_key_val_str(" ~~ ") == {}


def test_decode_key_val_str_with_string_value() -> None:
    assert decode_key_val_str("key~'someString'") == {"key": "someString"}
    assert decode_key_val_str("key~'someString'") == {"key": "someString"}
    assert decode_key_val_str("key~'someStringWithSep~'") == {"key": "someStringWithSep~"}
    assert decode_key_val_str("key~''") == {"key": ""}


def test_decode_key_val_str() -> None:
    d = decode_key_val_str("a~1.2~~b~3~~c~true~~d~'myStr'~~e~null")
    assert d == {"a": 1.2, "b": 3, "c": True, "d": "myStr", "e": None}


def test_encode_uint_list_str() -> None:
    assert encode_as_uint_list_str([]) == ""
    assert encode_as_uint_list_str([3, 1, 1, 3]) == "1!3"
    assert encode_as_uint_list_str([6, 5, 4, 2, 1, 0]) == "0-2!4-6"
    assert encode_as_uint_list_str([1, 2, 3, 10, 5, 7, 8]) == "1-3!5!7-8!10"


def test_decode_uint_list_str() -> None:
    assert decode_uint_list_str("") == []
    assert decode_uint_list_str("0") == [0]
    assert decode_uint_list_str("1-4!6") == [1, 2, 3, 4, 6]
