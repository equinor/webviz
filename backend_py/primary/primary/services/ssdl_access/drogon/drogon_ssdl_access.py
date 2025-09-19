from .. import types
from . import _drogon_well_data


class WellAccess:
    # pylint: disable=unused-argument
    def __init__(self, access_token: str):
        pass

    # pylint: disable=unused-argument
    async def get_completions_for_wellbore_async(self, wellbore_uuid: str) -> list[types.WellboreCompletion]:
        raise NotImplementedError

    # pylint: disable=unused-argument
    async def get_casings_for_wellbore_async(self, wellbore_uuid: str) -> list[types.WellboreCasing]:
        raise NotImplementedError

    # pylint: disable=unused-argument
    async def get_perforations_for_wellbore_async(self, wellbore_uuid: str) -> list[types.WellborePerforation]:
        raise NotImplementedError

    # pylint: disable=unused-argument
    async def get_log_curve_headers_for_wellbore_async(self, wellbore_uuid: str) -> list[types.WellboreLogCurveHeader]:
        if wellbore_uuid == "drogon_vertical":
            return _drogon_well_data.well_log_headers_1
        if wellbore_uuid == "drogon_horizontal":
            return _drogon_well_data.well_log_headers_2

        return []

    # pylint: disable=unused-argument
    async def get_log_curve_headers_for_field_async(self, field_uuid: str) -> list[types.WellboreLogCurveHeader]:
        raise NotImplementedError

    # pylint: disable=unused-argument
    async def get_log_curve_data_async(
        self, wellbore_uuid: str, curve_name: str, log_name: str
    ) -> types.WellboreLogCurveData:
        if wellbore_uuid == "drogon_vertical":
            return _drogon_well_data.well_log_data_map_1[curve_name]
        if wellbore_uuid == "drogon_horizontal":
            for curve in _drogon_well_data.well_log_data_map_2.values():
                if curve.name == curve_name and curve.log_name == log_name:
                    return curve
            raise ValueError(f"No curve {curve_name=} found for log {log_name=}!")

        raise ValueError(f"Unexpected drogon well name: {wellbore_uuid=}!")
