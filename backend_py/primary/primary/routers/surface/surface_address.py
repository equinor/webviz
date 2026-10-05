from typing import Literal, ClassVar, TypeAlias, TypeGuard
from dataclasses import dataclass

from webviz_services.sumo_access.surface_types import (
    StdResAttribute,
    SurfaceAttribute,
    SurfaceStandardResult,
    TagNameAttribute,
)

from primary.utils.query_string_utils import encode_as_uint_list_str, decode_uint_list_str

_ADDR_COMP_DELIMITER = "~~"

# The attribute always spans three components so the fields after it sit at fixed positions.
# Unused attribute components are left empty.
_ATTR_COMP_COUNT = 3

StatFunction: TypeAlias = Literal["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]

SurfaceAddressType: TypeAlias = Literal["REAL", "OBS", "STAT"]


@dataclass(frozen=True)
class RealizationSurfaceAddress:
    address_type: ClassVar[Literal["REAL"]] = "REAL"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: SurfaceAttribute
    realization: int
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        _require_non_empty(self.case_uuid, "RealizationSurfaceAddress.case_uuid")
        _require_non_empty(self.ensemble_name, "RealizationSurfaceAddress.ensemble_name")
        _require_non_empty(self.name, "RealizationSurfaceAddress.name")
        _require_valid_attribute(self.attribute, "RealizationSurfaceAddress.attribute")
        if not isinstance(self.realization, int):
            raise ValueError("RealizationSurfaceAddress.realization must be an integer")
        _require_none_or_non_empty(self.iso_time_or_interval, "RealizationSurfaceAddress.iso_time_or_interval")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "RealizationSurfaceAddress":
        # REAL~~case_uuid~~ensemble~~name~~<3 attribute components>~~realization[~~iso_time_or_interval]
        component_arr = _split_addr_str(addr_str, "REAL", 8)

        return cls(
            case_uuid=component_arr[1],
            ensemble_name=component_arr[2],
            name=component_arr[3],
            attribute=_attribute_from_components(component_arr, 4),
            realization=int(component_arr[7]),
            iso_time_or_interval=_optional_trailing_component(component_arr, 8),
        )

    def to_addr_str(self) -> str:
        component_arr = ["REAL", self.case_uuid, self.ensemble_name, self.name]
        component_arr += _attribute_to_components(self.attribute)
        component_arr.append(str(self.realization))
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        return _join_addr_components(component_arr)


@dataclass(frozen=True)
class ObservedSurfaceAddress:
    address_type: ClassVar[Literal["OBS"]] = "OBS"
    case_uuid: str
    name: str
    attribute: SurfaceAttribute
    iso_time_or_interval: str

    def __post_init__(self) -> None:
        _require_non_empty(self.case_uuid, "ObservedSurfaceAddress.case_uuid")
        _require_non_empty(self.name, "ObservedSurfaceAddress.name")
        _require_valid_attribute(self.attribute, "ObservedSurfaceAddress.attribute")
        _require_non_empty(self.iso_time_or_interval, "ObservedSurfaceAddress.iso_time_or_interval")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "ObservedSurfaceAddress":
        # OBS~~case_uuid~~name~~<3 attribute components>~~iso_time_or_interval
        component_arr = _split_addr_str(addr_str, "OBS", 7)

        return cls(
            case_uuid=component_arr[1],
            name=component_arr[2],
            attribute=_attribute_from_components(component_arr, 3),
            iso_time_or_interval=component_arr[6],
        )

    def to_addr_str(self) -> str:
        component_arr = ["OBS", self.case_uuid, self.name]
        component_arr += _attribute_to_components(self.attribute)
        component_arr.append(self.iso_time_or_interval)

        return _join_addr_components(component_arr)


@dataclass(frozen=True)
class StatisticalSurfaceAddress:
    address_type: ClassVar[Literal["STAT"]] = "STAT"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: SurfaceAttribute
    stat_function: StatFunction
    stat_realizations: list[int] | None
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        _require_non_empty(self.case_uuid, "StatisticalSurfaceAddress.case_uuid")
        _require_non_empty(self.ensemble_name, "StatisticalSurfaceAddress.ensemble_name")
        _require_non_empty(self.name, "StatisticalSurfaceAddress.name")
        _require_valid_attribute(self.attribute, "StatisticalSurfaceAddress.attribute")
        _require_non_empty(self.stat_function, "StatisticalSurfaceAddress.stat_function")
        if self.stat_realizations is not None and not isinstance(self.stat_realizations, list):
            raise ValueError("StatisticalSurfaceAddress.stat_realizations must be None or a list of integers")
        _require_none_or_non_empty(self.iso_time_or_interval, "StatisticalSurfaceAddress.iso_time_or_interval")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "StatisticalSurfaceAddress":
        # STAT~~case_uuid~~ensemble~~name~~<3 attribute components>~~stat_function~~stat_realizations[~~iso_time_or_interval]
        component_arr = _split_addr_str(addr_str, "STAT", 9)

        stat_function = component_arr[7]
        if not _is_valid_statistic_function(stat_function):
            raise ValueError("Invalid statistic function")

        realizations_str = component_arr[8]

        return cls(
            case_uuid=component_arr[1],
            ensemble_name=component_arr[2],
            name=component_arr[3],
            attribute=_attribute_from_components(component_arr, 4),
            stat_function=stat_function,
            stat_realizations=None if realizations_str == "*" else decode_uint_list_str(realizations_str),
            iso_time_or_interval=_optional_trailing_component(component_arr, 9),
        )

    def to_addr_str(self) -> str:
        realizations_str = "*" if self.stat_realizations is None else encode_as_uint_list_str(self.stat_realizations)

        component_arr = ["STAT", self.case_uuid, self.ensemble_name, self.name]
        component_arr += _attribute_to_components(self.attribute)
        component_arr += [self.stat_function, realizations_str]
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        return _join_addr_components(component_arr)


AnySurfaceAddress: TypeAlias = RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress

_ADDRESS_CLASS_BY_TYPE: dict[str, type[AnySurfaceAddress]] = {
    RealizationSurfaceAddress.address_type: RealizationSurfaceAddress,
    ObservedSurfaceAddress.address_type: ObservedSurfaceAddress,
    StatisticalSurfaceAddress.address_type: StatisticalSurfaceAddress,
}


def peek_surface_address_type(addr_str: str) -> SurfaceAddressType | None:
    addr_type_str = addr_str.split(_ADDR_COMP_DELIMITER)[0]
    if _is_valid_surface_address_type(addr_type_str):
        return addr_type_str

    return None


def decode_surf_addr_str(addr_str: str) -> AnySurfaceAddress:
    addr_type = peek_surface_address_type(addr_str)
    if addr_type is None:
        raise ValueError("Unknown or missing surface address type")

    return _ADDRESS_CLASS_BY_TYPE[addr_type].from_addr_str(addr_str)


def _attribute_to_components(attribute: SurfaceAttribute) -> list[str]:
    if isinstance(attribute, TagNameAttribute):
        return [TagNameAttribute.attribute_type, attribute.tag_name, ""]

    return [StdResAttribute.attribute_type, attribute.std_res_name.value, attribute.sub_name or ""]


def _attribute_from_components(component_arr: list[str], start_index: int) -> SurfaceAttribute:
    attr_type_str, comp_a, comp_b = component_arr[start_index : start_index + _ATTR_COMP_COUNT]

    if attr_type_str == TagNameAttribute.attribute_type:
        return TagNameAttribute(tag_name=comp_a)
    if attr_type_str == StdResAttribute.attribute_type:
        return StdResAttribute(std_res_name=SurfaceStandardResult(comp_a), sub_name=comp_b or None)

    raise ValueError(f"Unknown surface attribute type {attr_type_str}")


def _split_addr_str(addr_str: str, expected_addr_type: str, min_component_count: int) -> list[str]:
    component_arr = addr_str.split(_ADDR_COMP_DELIMITER)
    if component_arr[0] != expected_addr_type:
        raise ValueError("Wrong surface address type")
    if len(component_arr) < min_component_count:
        raise ValueError(f"Too few components in {expected_addr_type} address string")

    return component_arr


def _join_addr_components(component_arr: list[str]) -> str:
    for comp in component_arr:
        if _ADDR_COMP_DELIMITER in comp:
            raise ValueError(f"Address component contains delimiter, offending component: {comp}")

    return _ADDR_COMP_DELIMITER.join(component_arr)


def _optional_trailing_component(component_arr: list[str], index: int) -> str | None:
    if len(component_arr) > index and len(component_arr[index]) > 0:
        return component_arr[index]

    return None


def _require_non_empty(value: str, field_description: str) -> None:
    if not value:
        raise ValueError(f"{field_description} must be a non-empty string")


def _require_none_or_non_empty(value: str | None, field_description: str) -> None:
    if value is not None and len(value) == 0:
        raise ValueError(f"{field_description} must be None or a non-empty string")


def _require_valid_attribute(attribute: SurfaceAttribute, field_description: str) -> None:
    if isinstance(attribute, TagNameAttribute):
        _require_non_empty(attribute.tag_name, f"{field_description}.tag_name")
    else:
        _require_none_or_non_empty(attribute.sub_name, f"{field_description}.sub_name")


def _is_valid_surface_address_type(addr_type_str: str) -> TypeGuard[SurfaceAddressType]:
    return addr_type_str in _ADDRESS_CLASS_BY_TYPE


def _is_valid_statistic_function(stat_func_str: str) -> TypeGuard[StatFunction]:
    return stat_func_str in ["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]
