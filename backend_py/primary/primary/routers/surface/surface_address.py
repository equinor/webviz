from typing import Optional, Literal, Any, ClassVar, LiteralString, TypeGuard
from dataclasses import dataclass

from ...utils.query_string_utils import encode_as_uint_list_str, decode_uint_list_str

_DELIMITER = "~~"


@dataclass(frozen=True)
class RealSurfAddr:
    address_type: ClassVar[Literal["REAL"]] = "REAL"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: str
    realization: int
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("RealSurfAddr.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("RealSurfAddr.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("RealSurfAddr.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("RealSurfAddr.attribute must be a non-empty string")
        if type(self.realization) != int:
            raise ValueError("RealSurfAddr.realization must be an integer")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("RealSurfAddr.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "RealSurfAddr":
        component_arr = addr_str.split(_DELIMITER)
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
        return _DELIMITER.join(component_arr)


@dataclass(frozen=True)
class ObsSurfAddr:
    address_type: ClassVar[Literal["OBS"]] = "OBS"
    case_uuid: str
    name: str
    attribute: str
    iso_time_or_interval: str

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("ObsSurfAddr.case_uuid must be a non-empty string")
        if not self.name:
            raise ValueError("ObsSurfAddr.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("ObsSurfAddr.attribute must be a non-empty string")
        if not self.iso_time_or_interval:
            raise ValueError("ObsSurfAddr.iso_time_or_interval must non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "ObsSurfAddr":
        component_arr = addr_str.split(_DELIMITER)
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


@dataclass(frozen=True)
class PartialSurfAddr:
    address_type: ClassVar[Literal["PARTIAL"]] = "PARTIAL"
    case_uuid: str
    ensemble_name: str
    name: str
    attribute: str
    iso_time_or_interval: str | None

    def __post_init__(self) -> None:
        if not self.case_uuid:
            raise ValueError("PartialSurfAddr.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("PartialSurfAddr.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("PartialSurfAddr.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("PartialSurfAddr.attribute must be a non-empty string")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("PartialSurfAddr.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "PartialSurfAddr":
        component_arr = addr_str.split(_DELIMITER)
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
        return _DELIMITER.join(component_arr)


def is_int_list(my_list: list[object]) -> TypeGuard[list[int]]:
    '''Determines whether all objects in the list are ints'''
    return all(isinstance(i, int) for i in my_list)


def is_valid_statistic_function(stat_func_str: str) -> TypeGuard[Literal["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]]:
    return stat_func_str in ["MEAN", "STD", "MIN", "MAX", "P10", "P90", "P50"]



@dataclass(frozen=True)
class StatSurfAddr:
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
            raise ValueError("StatSurfAddr.case_uuid must be a non-empty string")
        if not self.ensemble_name:
            raise ValueError("StatSurfAddr.ensemble_name must be a non-empty string")
        if not self.name:
            raise ValueError("StatSurfAddr.name must be a non-empty string")
        if not self.attribute:
            raise ValueError("StatSurfAddr.attribute must be a non-empty string")
        if not self.stat_function:
            raise ValueError("StatSurfAddr.statistic_function must be a non-empty string")
        if self.stat_realizations and not isinstance(self.stat_realizations, list):
            raise ValueError("StatSurfAddr.realizations must be None or a list of integers")
        if self.iso_time_or_interval and len(self.iso_time_or_interval) == 0:
            raise ValueError("StatSurfAddr.iso_time_or_interval must be None or a non-empty string")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "StatSurfAddr":
        component_arr = addr_str.split(_DELIMITER)
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

        if not is_valid_statistic_function(statistic_function):
            raise ValueError("Invalid statistic function")

        return cls(case_uuid, ensemble_name, surface_name, attribute_name, statistic_function, realizations, iso_date_or_interval)

    def to_addr_str(self) -> str:
        realizations_str = "*"
        if self.stat_realizations is not None:
            realizations_str = encode_as_uint_list_str(self.stat_realizations)

        component_arr = ["STAT", self.case_uuid, self.ensemble_name, self.name, self.attribute, self.stat_function, realizations_str]
        if self.iso_time_or_interval:
            component_arr.append(self.iso_time_or_interval)

        return _DELIMITER.join(component_arr)



def peek_surf_addr_type(addr_str: str) -> Literal["REAL", "OBS", "STAT", "PARTIAL"] | None:
    component_arr = addr_str.split(_DELIMITER)
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


def decode_surf_addr_str(addr_str: str) -> RealSurfAddr | ObsSurfAddr | StatSurfAddr | PartialSurfAddr:
    addr_type = peek_surf_addr_type(addr_str)
    if addr_type is None:
        raise ValueError("Unknown or missing surface address type")

    if addr_type == "REAL":
        return RealSurfAddr.from_addr_str(addr_str)
    if addr_type == "OBS":
        return ObsSurfAddr.from_addr_str(addr_str)
    if addr_type == "STAT":
        return StatSurfAddr.from_addr_str(addr_str)
    if addr_type == "PARTIAL":
        return PartialSurfAddr.from_addr_str(addr_str)

    raise ValueError(f"Unsupported surface address type {addr_type=}")




# Running:
#   python -m primary.routers.surface.surface_address
if __name__ == "__main__":
    print("Testing SurfAddr\n")

    a0 : PartialSurfAddr | RealSurfAddr | StatSurfAddr
    a1 : PartialSurfAddr | RealSurfAddr | StatSurfAddr

    # a0 = PartialSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", None)
    # a1 = PartialSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    # a0 = RealSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", realization=1, iso_time_or_interval=None)
    # a1 = RealSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    # a0 = PartialSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", "1997-07-02T00:00:00/2006-07-02T00:00:00")
    # a1 = PartialSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    a0 = StatSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", "MEAN", None, "1997-07-02T00:00:00/2006-07-02T00:00:00")
    a1 = StatSurfAddr.from_addr_str(a0.to_addr_str())
    print(f"{type(a0)=}  {a0.to_addr_str()=}")
    print(f"{type(a1)=}  {a1=}")

    a0 = StatSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", "MEAN", [1,3,4,6,7,9], "1997-07-02T00:00:00/2006-07-02T00:00:00")
    a1 = StatSurfAddr.from_addr_str(a0.to_addr_str())
    print(f"{type(a0)=}  {a0.to_addr_str()=}")
    print(f"{type(a1)=}  {a1=}")

    a0 = StatSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", "MEAN", [], "1997-07-02T00:00:00/2006-07-02T00:00:00")
    print(f"{type(a0)=}  {a0.to_addr_str()=}")
    a1 = StatSurfAddr.from_addr_str(a0.to_addr_str())
    print(f"{type(a1)=}  {a1=}")

    # b = decode_surf_addr_str(a1.to_addr_str())
