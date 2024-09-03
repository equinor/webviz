import json

_KEYVAL_ASSIGN_SEP = "~"
_KEYVAL_ELEMENT_SEP = "~~"


def decode_key_val_str(key_val_str: str) -> dict[str, str | int | float | bool | None]:
    """
    Decodes a KeyValStr into a dictionary of key-value pairs.

    A KeyValStr encodes a non-hierarchical set of key-value pairs as a single string.
    Only primitive value types are supported: string, number, boolean, null

    The key-value string is encoded as follows:
     - Each key-value pair is separated by "~~"
     - The key and value are separated by "~" (think of it as assignment)
     - String values are enclosed in single quotes

    Example encoded string:
        encodedKeyValString = "key1~123.5~~key2~'someString'~~key3~false"

    """
    key_val_str = key_val_str.strip()
    pairs_arr = key_val_str.split(_KEYVAL_ELEMENT_SEP)

    prop_dict: dict[str, str | int | float | bool | None] = {}
    for pair_str in pairs_arr:
        pair_str = pair_str.strip()
        if len(pair_str) == 0:
            continue

        key, value_str = pair_str.split(_KEYVAL_ASSIGN_SEP, 1)
        if len(value_str) >= 2 and value_str.startswith("'") and value_str.endswith("'"):
            # It's a string - strip the quotes
            value_str = value_str[1:-1]
            prop_dict[key] = value_str
        else:
            # Utilize value parsing from json
            value = json.loads(value_str)
            prop_dict[key] = value

    return prop_dict


def decode_uint_list_str(int_arr_str: str) -> list[int]:
    """
    Decode a UintListStr formatted string representing a list of unsigned integers.
    Single integers are represented as themselves, while consecutive integers are represented as a <start>-<end> range.
    All entries are separated by "!".

    Note that this encoding does not maintained ordering and does not support duplicates.

    Example: "1-3!5-7!10" -> [1, 2, 3, 5, 6, 7, 10]
    """
    if len(int_arr_str) == 0:
        return []

    elements = int_arr_str.split("!")
    int_arr: list[int] = []
    for element in elements:
        if "-" in element:
            start_str, end_str = element.split("-")
            start, end = int(start_str), int(end_str)
            int_arr.extend(range(start, end + 1))
        else:
            int_arr.append(int(element))

    ret_arr = sorted(set(int_arr))

    return ret_arr


def encode_as_uint_list_str(unsigned_int_list: list[int]) -> str:
    """
    Encode a list of unsigned integers into a UintListStr formatted string.
    Single integers are represented as themselves, while consecutive integers are represented as a <start>-<end> range.
    All entries are separated by "!".

    Note that this encoding does not maintained ordering and does not support duplicates.

    Example: [1, 2, 3, 5, 6, 7, 10] -> "1-3!5-7!10"
    """
    if not unsigned_int_list:
        return ""

    # Remove duplicates and sort
    unsigned_int_list = sorted(set(unsigned_int_list))

    # Verify that all integers are unsigned by checking first element in the now sorted list
    if unsigned_int_list[0] < 0:
        raise ValueError("List contains negative integers")

    encoded_parts = []
    start_val = unsigned_int_list[0]
    end_val = start_val

    for val in unsigned_int_list[1:]:
        if val == end_val + 1:
            end_val = val
        else:
            if start_val == end_val:
                encoded_parts.append(f"{start_val}")
            else:
                encoded_parts.append(f"{start_val}-{end_val}")
            start_val = val
            end_val = val

    # Add the last one
    if start_val == end_val:
        encoded_parts.append(f"{start_val}")
    else:
        encoded_parts.append(f"{start_val}-{end_val}")

    return "!".join(encoded_parts)
