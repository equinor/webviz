import json

KEYVAL_ASSIGN_SEP = "~"
KEYVAL_ELEMENT_SEP = "~~"


def decode_key_val_str(key_val_str: str) -> dict[str, str | int | float | bool | None]:
    """
    Decodes a KeyValStr into a dictionary of key-value pairs.

    A KeyValStr encodes a non-hierarchical set of key-value pairs as a single string.
    The key-value string is encoded as follows:
     - Each key-value pair is separated by "~~"
     - The key and value are separated by "~" (think of it as assignment)
     - String values are enclosed in single quotes
    """
    key_val_str = key_val_str.strip()
    pairs_arr = key_val_str.split(KEYVAL_ELEMENT_SEP)

    prop_dict: dict[str, str | int | float | bool | None] = {}
    for pair_str in pairs_arr:
        pair_str = pair_str.strip()
        if len(pair_str) == 0:
            continue

        key, value_str = pair_str.split(KEYVAL_ASSIGN_SEP, 1)
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


def encode_as_uint_list_str(int_list: list[int]) -> str:
    """
    Encode a list of unsigned integers into a UintListStr formatted string.
    Single integers are represented as themselves, while consecutive integers are represented as a <start>-<end> range.
    All entries are separated by "!".

    Example: [1, 2, 3, 5, 6, 7, 10] -> "1-3!5-7!10"
    """
    if not int_list:
        return ""

    # Remove duplicates and sort
    int_list = sorted(set(int_list))

    encoded_parts = []
    start_val = int_list[0]
    end_val = start_val

    for val in int_list[1:]:
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
