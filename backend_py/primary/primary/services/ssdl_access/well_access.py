from typing import List, Optional
from pydantic import ValidationError
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
)
from ._ssdl_get_request import fetch_from_ssdl

from . import schemas


class WellAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    # async def get_completions_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellBoreCompletion]:
    #     endpoint = f"Wellbores/{wellbore_uuid}/completion"
    #     params = {"normalized_data": True}
    #     timer = PerfTimer()
    #     result = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
    #     print(f"TIME SSDL fetch completions for wellbore {wellbore_uuid} took {timer.lap_s():.2f} seconds")

    #     return result

    async def get_casing_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellBoreCasing]:
        endpoint = f"Wellbores/{wellbore_uuid}/casing"
        params = {"source": "dbr"}
        result = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = [schemas.WellBoreCasing.model_validate(casing) for casing in result]
        except ValidationError as e:
            raise InvalidDataError(f"Invalid casing data for wellbore {wellbore_uuid}", Service.SSDL) from e
        return result

    async def get_log_curve_headers_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellBoreLogCurveInfo]:
        endpoint = f"WellLog/{wellbore_uuid}"
        result = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            result = [schemas.WellBoreLogCurveInfo.model_validate(log_curve) for log_curve in result]
        except ValidationError as e:
            raise InvalidDataError(f"Invalid log curve headers for wellbore {wellbore_uuid}", Service.SSDL) from e
        return result

    async def get_log_curve_headers_for_field(self, field_uuid: str) -> List[schemas.WellBoreLogCurveInfo]:
        endpoint = f"WellLog/field/{field_uuid}"
        result = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            result = [schemas.WellBoreLogCurveInfo.model_validate(log_curve) for log_curve in result]
        except ValidationError as e:
            raise InvalidDataError(f"Invalid log curve headers for field {field_uuid}", Service.SSDL) from e
        return result

    async def get_log_curve_data(self, wellbore_uuid: str, curve_name: str) -> schemas.WellBoreLogCurveData:
        params = {"normalized_data": False}
        endpoint = f"WellLog/{wellbore_uuid}/{curve_name}"
        result = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = schemas.WellBoreLogCurveData.model_validate(result)
        except ValidationError as e:
            raise InvalidDataError(
                f"Invalid log curve data for wellbore {wellbore_uuid} and curve {curve_name} {e}", Service.SSDL
            ) from e
        return result
