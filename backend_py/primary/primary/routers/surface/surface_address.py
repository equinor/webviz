from typing import Literal, ClassVar, TypeGuard
from dataclasses import dataclass

from primary.utils.query_string_utils import encode_as_uint_list_str, decode_uint_list_str

_ADDR_COMP_DELIMITER = "~~"


@dataclass(frozen=True)
class RealizationSurfaceAddress:
    address_type: ClassVar[Literal["REAL"]] = "REAL"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: str
    realization: int
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("RealizationSurfaceAddress.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("RealSurfAddr.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("RealizationSurfaceAddress.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("RealizationSurfaceAddress.attribute must be a non-empty string")
        if not isinstance(self.realization, int):
            raise ValueError("RealizationSurfaceAddress.realization must be an integer")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("RealizationSurfaceAddress.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "RealizationSurfaceAddress":
        component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
        if len(component_arr) == 1:
            raise ValueError("Could not parse string as a surface address")

        addr_type_str = component_arr[0]
        if addr_type_str != "REAL":
            raise ValueError("Wrong surface address type")

        if len(component_arr) < 6:
            raise ValueError("Too few components in realization address string")

        case_uuid = component_arr[1]
        ensemble_name = component_arr[2]
        surface_name = component_arr[3]
        attribute_name = component_arr[4]
        realization = int(component_arr[5])

        iso_date_or_interval: str | None = None
        if len(component_arr) > 6 and len(component_arr[6]) > 0:
            iso_date_or_interval = component_arr[6]

        return cls(case_uuid, ensemble_name, surface_name, attribute_name, realization, iso_date_or_interval)

    def to_addr_str(self) -> str:
        component_arr = ["REAL", self.case_uuid, self.ensemble_name, self.name, self.attribute, str(self.realization)]
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        _assert_that_no_components_contain_delimiter(component_arr)

        return _ADDR_COMP_DELIMITER.join(component_arr)


@dataclass(frozen=True)
class ObservedSurfaceAddress:
    address_type: ClassVar[Literal["OBS"]] = "OBS"
    case_uuid: str
    name: str
    attribute: str
    iso_time_or_interval: str

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("ObservedSurfaceAddress.case_uuid must be a non-empty string")
        if not self.name:
            raise ValueError("ObservedSurfaceAddress.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("ObservedSurfaceAddress.attribute must be a non-empty string")
        if not self.iso_time_or_interval:
            raise ValueError("ObservedSurfaceAddress.iso_time_or_interval must non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "ObservedSurfaceAddress":
        component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
        if len(component_arr) == 1:
            raise ValueError("Could not parse string as a surface address")

        addr_type_str = component_arr[0]
        if addr_type_str != "OBS":
            raise ValueError("Wrong surface address type")

        if len(component_arr) < 5:
            raise ValueError("Too few components in observed address string")

        case_uuid = component_arr[1]
        surface_name = component_arr[2]
        attribute_name = component_arr[3]
        iso_date_or_interval = component_arr[4]

        return cls(case_uuid, surface_name, attribute_name, iso_date_or_interval)

    def to_addr_str(self) -> str:
        component_arr = ["OBS", self.case_uuid, self.name, self.attribute, self.iso_time_or_interval]

        _assert_that_no_components_contain_delimiter(component_arr)

        return _ADDR_COMP_DELIMITER.join(component_arr)


@dataclass(frozen=True)
class StatisticalSurfaceAddress:
    address_type: ClassVar[Literal["STAT"]] = "STAT"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: str
    stat_function: Literal["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]
    stat_realizations: list[int] | None
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("StatisticalSurfaceAddress.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("StatisticalSurfaceAddress.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("StatisticalSurfaceAddress.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("StatisticalSurfaceAddress.attribute must be a non-empty string")
        if not self.stat_function:
            raise ValueError("StatisticalSurfaceAddress.statistic_function must be a non-empty string")
        if self.stat_realizations and not isinstance(self.stat_realizations, list):
            raise ValueError("StatisticalSurfaceAddress.realizations must be None or a list of integers")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("StatisticalSurfaceAddress.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "StatisticalSurfaceAddress":
        component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
        if len(component_arr) == 1:
            raise ValueError("Could not parse string as a surface address")

        addr_type_str = component_arr[0]
        if addr_type_str != "STAT":
            raise ValueError("Wrong surface address type")

        if len(component_arr) < 7:
            raise ValueError("Too few components in statistical address string")

        case_uuid = component_arr[1]
        ensemble_name = component_arr[2]
        surface_name = component_arr[3]
        attribute_name = component_arr[4]
        statistic_function = component_arr[5]
        realizations_str = component_arr[6]

        iso_date_or_interval: str | None = None
        if len(component_arr) > 7 and len(component_arr[7]) > 0:
            iso_date_or_interval = component_arr[7]

        realizations: list[int] | None = None
        if realizations_str != "*":
            realizations = decode_uint_list_str(realizations_str)

        if not _is_valid_statistic_function(statistic_function):
            raise ValueError("Invalid statistic function")

        return cls(
            case_uuid,
            ensemble_name,
            surface_name,
            attribute_name,
            statistic_function,
            realizations,
            iso_date_or_interval,
        )

    def to_addr_str(self) -> str:
        realizations_str = "*"
        if self.stat_realizations is not None:
            realizations_str = encode_as_uint_list_str(self.stat_realizations)

        component_arr = [
            "STAT",
            self.case_uuid,
            self.ensemble_name,
            self.name,
            self.attribute,
            self.stat_function,
            realizations_str,
        ]
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        _assert_that_no_components_contain_delimiter(component_arr)

        return _ADDR_COMP_DELIMITER.join(component_arr)


@dataclass(frozen=True)
class PartialSurfaceAddress:
    address_type: ClassVar[Literal["PARTIAL"]] = "PARTIAL"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: str
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("PartialSurfaceAddress.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("PartialSurfaceAddress.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("PartialSurfaceAddress.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("PartialSurfaceAddress.attribute must be a non-empty string")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("PartialSurfaceAddress.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "PartialSurfaceAddress":
        component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
        if len(component_arr) == 1:
            raise ValueError("Could not parse string as a surface address")

        addr_type_str = component_arr[0]
        if addr_type_str != "PARTIAL":
            raise ValueError("Wrong surface address type")

        if len(component_arr) < 5:
            raise ValueError("Too few components in partial address string")

        case_uuid = component_arr[1]
        ensemble_name = component_arr[2]
        surface_name = component_arr[3]
        attribute_name = component_arr[4]

        iso_date_or_interval: str | None = None
        if len(component_arr) > 5 and len(component_arr[5]) > 0:
            iso_date_or_interval = component_arr[5]

        return cls(case_uuid, ensemble_name, surface_name, attribute_name, iso_date_or_interval)

    def to_addr_str(self) -> str:
        component_arr = ["PARTIAL", self.case_uuid, self.ensemble_name, self.name, self.attribute]
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        _assert_that_no_components_contain_delimiter(component_arr)

        return _ADDR_COMP_DELIMITER.join(component_arr)


def peek_surface_address_type(addr_str: str) -> Literal["REAL", "OBS", "STAT", "PARTIAL"] | None:
    component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
    if len(component_arr) < 1:
        return None

    addr_type_str = component_arr[0]
    if addr_type_str == "REAL":
        return "REAL"
    if addr_type_str == "OBS":
        return "OBS"
    if addr_type_str == "STAT":
        return "STAT"
    if addr_type_str == "PARTIAL":
        return "PARTIAL"

    return None


def decode_surf_addr_str(
    addr_str: str,
) -> RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress | PartialSurfaceAddress:
    addr_type = peek_surface_address_type(addr_str)
    if addr_type is None:
        raise ValueError("Unknown or missing surface address type")

    if addr_type == "REAL":
        return RealizationSurfaceAddress.from_addr_str(addr_str)
    if addr_type == "OBS":
        return ObservedSurfaceAddress.from_addr_str(addr_str)
    if addr_type == "STAT":
        return StatisticalSurfaceAddress.from_addr_str(addr_str)
    if addr_type == "PARTIAL":
        return PartialSurfaceAddress.from_addr_str(addr_str)

    raise ValueError(f"Unsupported surface address type {addr_type=}")


def _is_valid_statistic_function(
    stat_func_str: str,
) -> TypeGuard[Literal["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]]:
    return stat_func_str in ["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]


def _assert_that_no_components_contain_delimiter(component_arr: list[str]) -> None:
    for comp in component_arr:
        if _ADDR_COMP_DELIMITER in comp:
            raise ValueError(f"Address component contains delimiter, offending component: {comp}")
