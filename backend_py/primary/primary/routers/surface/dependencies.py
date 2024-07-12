from typing import Annotated
import logging

from fastapi import Query
from fastapi.exceptions import RequestValidationError
from pydantic import parse_obj_as, ValidationError

from . import schemas
from primary.utils.query_string_utils import decode_key_val_str

LOGGER = logging.getLogger(__name__)


def get_resample_to_param_from_json(
    resample_to_def_json_str: Annotated[str | None, Query(description="Definition of the surface onto which the data should be resampled. Should be a serialized JSON representation of a SurfaceDef object")] = None
) -> schemas.SurfaceDef | None:
    if resample_to_def_json_str is None:
        return None

    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {type(resample_to_def_json_str)=}")
    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {resample_to_def_json_str=}")

    try:
        # surf_def_obj: schemas.SurfaceDef = parse_obj_as(schemas.SurfaceDef, resample_to_surf)

        # validator = TypeAdapter(schemas.SurfaceDef)
        # surf_def_obj: schemas.SurfaceDef = validator.validate_python(resample_to_surf)

        # surf_def_obj: schemas.SurfaceDef = schemas.SurfaceDef.model_validate(resample_to_surf)

        surf_def_obj: schemas.SurfaceDef = schemas.SurfaceDef.model_validate_json(resample_to_def_json_str)

    except ValidationError as e:
        raise RequestValidationError(errors=e.errors())

    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {type(surf_def_obj)=}")
    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {surf_def_obj=}")

    return surf_def_obj


KEYVAL_STR_DOCS = """

A KeyValString encodes a set of key-value pairs as a single string.

The key-value string is encoded as follows:
- Each key-value pair is separated by "~~"
- The key and value are separated by "~"
- String values are enclosed in single quotes

Only primitive value types are supported: string, number, boolean, null
Only encodes the top level properties of the object and ignores nested objects.

Example:
encodedKeyValString = "key1~123.5~~key2~'someString'~~key3~false"
"""


def get_resample_to_param_from_keyval_str(
    resample_to_def_str: Annotated[str | None, Query(description="Definition of the surface onto which the data should be resampled. *SurfaceDef* object properties encoded as a `KeyValStr` string.")] = None
) -> schemas.SurfaceDef | None:
    if resample_to_def_str is None:
        return None

    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {type(resample_to_def_str)=}")
    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {resample_to_def_str=}")

    prop_dict = decode_key_val_str(resample_to_def_str)
    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {prop_dict=}")

    surf_def_obj = schemas.SurfaceDef.model_validate(prop_dict)

    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {type(surf_def_obj)=}")
    LOGGER.info(f">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> {surf_def_obj=}")

    return surf_def_obj
