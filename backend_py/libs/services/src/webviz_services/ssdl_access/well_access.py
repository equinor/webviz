from typing import List, Optional, TypeVar, Type
from pydantic import ValidationError, BaseModel

from webviz_services.service_exceptions import (
    Service,
    InvalidDataError,
)
from ._ssdl_get_request import ssdl_get_request_async

from . import types

T = TypeVar("T", bound=BaseModel)


class WellAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    async def get_fields_async(self) -> List[types.FieldInfo]:
        """Get list of fields"""
        return await self._fetch_and_validate_list_async(
            endpoint="Field", model_type=types.FieldInfo, error_context="field"
        )

    async def get_field_perforations_async(self, field_uuid: str) -> List[types.WellborePerforation]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"Field/{field_uuid}/perforations",
            model_type=types.WellborePerforation,
            params={"normalized_data": True},
            error_context=f"perforation data for field {field_uuid}",
        )

    async def get_field_screens_async(self, field_uuid: str) -> List[types.WellboreCompletion]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"Field/{field_uuid}/completions",
            model_type=types.WellboreCompletion,
            params={"normalized_data": True, "filter": "Screen"},
            error_context=f"completion data for field {field_uuid}",
            handle_dict_values=True,
        )

    async def get_completions_for_wellbore_async(self, wellbore_uuid: str) -> List[types.WellboreCompletion]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"Wellbores/{wellbore_uuid}/completion",
            model_type=types.WellboreCompletion,
            params={"normalized_data": True},
            error_context=f"completion data for wellbore {wellbore_uuid}",
        )

    async def get_casings_for_wellbore_async(self, wellbore_uuid: str) -> List[types.WellboreCasing]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"Wellbores/{wellbore_uuid}/casing",
            model_type=types.WellboreCasing,
            params={"source": "dbr"},
            error_context=f"casing data for wellbore {wellbore_uuid}",
        )

    async def get_perforations_for_wellbore_async(self, wellbore_uuid: str) -> List[types.WellborePerforation]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"Wellbores/{wellbore_uuid}/perforations",
            model_type=types.WellborePerforation,
            params={"normalized-data": False, "details": True},
            error_context=f"perforation data for wellbore {wellbore_uuid}",
        )

    async def get_log_curve_headers_for_wellbore_async(self, wellbore_uuid: str) -> List[types.WellboreLogCurveHeader]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"WellLog/{wellbore_uuid}",
            model_type=types.WellboreLogCurveHeader,
            error_context=f"log curve headers for wellbore {wellbore_uuid}",
            deduplicate=True,  # This endpoint might return duplicates
        )

    async def get_log_curve_headers_for_field_async(self, field_uuid: str) -> List[types.WellboreLogCurveHeader]:
        return await self._fetch_and_validate_list_async(
            endpoint=f"WellLog/field/{field_uuid}",
            model_type=types.WellboreLogCurveHeader,
            error_context=f"log curve headers for field {field_uuid}",
        )

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

    async def _fetch_and_validate_list_async(
        self,
        endpoint: str,
        model_type: Type[T],
        params: Optional[dict] = None,
        error_context: str = "",
        deduplicate: bool = False,
        handle_dict_values: bool = False,
    ) -> List[T]:
        """
        Generic helper to fetch data from SSDL and validate it into a list of Pydantic models.

        Args:
            endpoint: The SSDL API endpoint
            model_type: The Pydantic model class to validate against
            params: Optional query parameters
            error_context: Context string for error messages
            deduplicate: Whether to remove duplicates using a set
            handle_dict_values: Whether to handle dict responses by iterating over values
        """
        ssdl_data = await ssdl_get_request_async(access_token=self._ssdl_token, endpoint=endpoint, params=params)

        try:
            result: List[T] = []

            if handle_dict_values and isinstance(ssdl_data, dict):
                # Handle dict responses where values contain the actual data
                for items in ssdl_data.values():
                    for item in items:
                        result.append(model_type.model_validate(item))
            else:
                # Handle list responses directly
                data_to_process = ssdl_data if isinstance(ssdl_data, list) else [ssdl_data]
                for item in data_to_process:
                    result.append(model_type.model_validate(item))

            if deduplicate:
                return list(set(result))

            return result

        except ValidationError as error:
            error_msg = f"Invalid {error_context} data" if error_context else "Invalid data"
            raise InvalidDataError(error_msg, Service.SSDL) from error
