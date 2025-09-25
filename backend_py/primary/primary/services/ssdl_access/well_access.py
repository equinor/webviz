from typing import List, Type, TypeVar
from pydantic import BaseModel, ValidationError
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
)
from ._ssdl_request import ssdl_get_request_async, ssdl_post_request_async

from . import types

T = TypeVar("T", bound=BaseModel)


class WellAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    async def _get_wellbore_list_data_async(
        self, wellbore_uuids: List[str], endpoint: str, params: dict, model_class: Type[T], data_type_name: str
    ) -> List[T]:
        """
        Generic method to fetch and validate wellbore data that returns lists of items per wellbore.
        Specifically handles the pattern used by completions, casings, and perforations endpoints.
        """
        ssdl_data = await ssdl_post_request_async(
            access_token=self._ssdl_token, endpoint=endpoint, data=wellbore_uuids, params=params
        )

        result = []
        for wellbore_uuid, items in ssdl_data.items():
            if not isinstance(items, list):
                raise InvalidDataError(
                    f"Invalid {data_type_name} data for wellbore {wellbore_uuid}: Expected a list but got {type(items)}",
                    Service.SSDL,
                )
            for item in items:
                try:
                    validated_item = model_class.model_validate(item)
                    result.append(validated_item)
                except ValidationError as error:
                    raise InvalidDataError(
                        f"Invalid {data_type_name} data for wellbore {wellbore_uuid}: {error}", Service.SSDL
                    ) from error
        return result

    async def get_completions_for_wellbores_async(self, wellbore_uuids: List[str]) -> List[types.WellboreCompletion]:
        return await self._get_wellbore_list_data_async(
            wellbore_uuids=wellbore_uuids,
            endpoint="Wellbores/completion",
            params={"normalized_data": True},
            model_class=types.WellboreCompletion,
            data_type_name="completion",
        )

    async def get_casings_for_wellbores_async(self, wellbore_uuids: List[str]) -> List[types.WellboreCasing]:
        return await self._get_wellbore_list_data_async(
            wellbore_uuids=wellbore_uuids,
            endpoint="Wellbores/casings",
            params={"source": "dbr"},
            model_class=types.WellboreCasing,
            data_type_name="casing",
        )

    async def get_perforations_for_wellbores_async(self, wellbore_uuids: List[str]) -> List[types.WellborePerforation]:
        return await self._get_wellbore_list_data_async(
            wellbore_uuids=wellbore_uuids,
            endpoint="Wellbores/perforations",
            params={"normalized-data": False, "details": True},
            model_class=types.WellborePerforation,
            data_type_name="perforation",
        )

    async def get_log_curve_headers_for_wellbore_async(self, wellbore_uuid: str) -> List[types.WellboreLogCurveHeader]:
        endpoint = f"WellLog/{wellbore_uuid}"
        ssdl_data = await ssdl_get_request_async(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            # This endpoint is a bit weird, and MIGHT return duplicates which, as far as I can tell, are the exact same. Using a set to drop duplicates. See data model for comparator
            result_set = {types.WellboreLogCurveHeader.model_validate(log_curve) for log_curve in ssdl_data}

        except ValidationError as error:
            raise InvalidDataError(f"Invalid log curve headers for wellbore {wellbore_uuid}", Service.SSDL) from error
        return list(result_set)

    async def get_log_curve_headers_for_field_async(self, field_uuid: str) -> List[types.WellboreLogCurveHeader]:
        endpoint = f"WellLog/field/{field_uuid}"
        ssdl_data = await ssdl_get_request_async(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            result = [types.WellboreLogCurveHeader.model_validate(log_curve) for log_curve in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(f"Invalid log curve headers for field {field_uuid}", Service.SSDL) from error
        return result

    async def get_log_curve_data_async(
        self, wellbore_uuid: str, curve_name: str, log_name: str
    ) -> types.WellboreLogCurveData:
        # ! Note: SSDL does not actually take the curve name into account when fetching data, but curve names are not unique across
        # ! all logs, and there's no documentation about how one should specify the log, when picking curves. For now, I'm including
        # ! log name as an argument, since we should fix that at some point in the future.
        params = {"normalized_data": False, "log_name": log_name}
        endpoint = f"WellLog/{wellbore_uuid}/{curve_name}"
        ssdl_data = await ssdl_get_request_async(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = types.WellboreLogCurveData.model_validate(ssdl_data)
        except ValidationError as error:
            raise InvalidDataError(
                f"Invalid log curve data for wellbore {wellbore_uuid} and curve {curve_name}", Service.SSDL
            ) from error
        return result
