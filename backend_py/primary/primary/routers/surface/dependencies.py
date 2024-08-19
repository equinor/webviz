import logging
from typing import Annotated

from fastapi import Query
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from primary.utils.query_string_utils import decode_key_val_str

from . import schemas

LOGGER = logging.getLogger(__name__)


def get_resample_to_param_from_json(
    # fmt:off
    resample_to_def_json_str: Annotated[str | None, Query(description="Definition of the surface onto which the data should be resampled. Should be a serialized JSON representation of a SurfaceDef object")] = None
    # fmt:on
) -> schemas.SurfaceDef | None:
    if resample_to_def_json_str is None:
        return None

    try:
        surf_def_obj: schemas.SurfaceDef = schemas.SurfaceDef.model_validate_json(resample_to_def_json_str)
    except ValidationError as exc:
        raise RequestValidationError(errors=exc.errors()) from exc

    return surf_def_obj


def get_resample_to_param_from_keyval_str(
    # fmt:off
    resample_to_def_str: Annotated[str | None, Query(description="Definition of the surface onto which the data should be resampled. *SurfaceDef* object properties encoded as a `KeyValStr` string.")] = None
    # fmt:on
) -> schemas.SurfaceDef | None:
    if resample_to_def_str is None:
        return None

    prop_dict = decode_key_val_str(resample_to_def_str)
    surf_def_obj = schemas.SurfaceDef.model_validate(prop_dict)

    return surf_def_obj
