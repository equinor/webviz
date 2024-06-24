from typing import Optional
from dataclasses import dataclass


@dataclass(frozen=True)
class RealSurfAddr:
    case_uuid: str
    iteration_name: str
    surface_name: str
    attribute_name: str
    realization: int
    iso_date_or_interval: str | None

    def __post_init__(self):
        if not self.case_uuid:
            raise ValueError("case_uuid must be a non-empty string")
        if not self.iteration_name:
            raise ValueError("iteration_name must be a non-empty string")
        if not self.surface_name:
            raise ValueError("surface_name must be a non-empty string")
        if not self.attribute_name:
            raise ValueError("attribute_name must be a non-empty string")
        if type(self.realization) != int:
            raise ValueError("realization must be an integer")
        if self.iso_date_or_interval and len(self.iso_date_or_interval) == 0:
            raise ValueError("iso_date_or_interval cannot be empty")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> "RealSurfAddr":
        component_arr = addr_str.split("~")
        if len(component_arr) < 6:
            raise ValueError("Too few components in address string")

        addr_type = component_arr[0]
        if addr_type != "REAL":
            raise ValueError("Wrong address type")

        case_uuid = component_arr[1]
        iteration_name = component_arr[2]
        surface_name = component_arr[3]
        attribute_name = component_arr[4]
        realization = int(component_arr[5])

        iso_date_or_interval: str | None = None
        if len(component_arr) > 6 and len(component_arr[6]) > 0:
            iso_date_or_interval = component_arr[6]

        return cls(case_uuid, iteration_name, surface_name, attribute_name, realization, iso_date_or_interval)

    def to_addr_str(self) -> str:
        component_arr = ["REAL", self.case_uuid, self.iteration_name, self.surface_name, self.attribute_name, str(self.realization)]
        if self.iso_date_or_interval:
            component_arr.append(self.iso_date_or_interval)
        return "~".join(component_arr)


@dataclass(frozen=True)
class ObsSurfAddr:
    case_uuid: str
    surface_name: str
    attribute_name: str
    iso_date_or_interval: str


@dataclass(frozen=True)
class PartialSurfAddr:
    case_uuid: str
    iteration_name: str
    surface_name: str
    attribute_name: str
    iso_date_or_interval: str | None

    def __post_init__(self):
        if not self.case_uuid:
            raise ValueError("case_uuid must be a non-empty string")
        if not self.iteration_name:
            raise ValueError("iteration_name must be a non-empty string")
        if not self.surface_name:
            raise ValueError("surface_name must be a non-empty string")
        if not self.attribute_name:
            raise ValueError("attribute_name must be a non-empty string")
        if self.iso_date_or_interval and len(self.iso_date_or_interval) == 0:
            raise ValueError("iso_date_or_interval cannot be empty")

    @classmethod
    def from_addr_str(cls, addr_str: str) -> Optional["PartialSurfAddr"]:
        component_arr = addr_str.split("~")
        if len(component_arr) < 5:
            raise ValueError("Too few components in address string")

        addr_type = component_arr[0]
        if addr_type != "PARTIAL":
            raise ValueError("Wrong address type")

        case_uuid = component_arr[1]
        iteration_name = component_arr[2]
        surface_name = component_arr[3]
        attribute_name = component_arr[4]

        iso_date_or_interval: str | None = None
        if len(component_arr) > 5 and len(component_arr[5]) > 0:
            iso_date_or_interval = component_arr[5]

        return cls(case_uuid, iteration_name, surface_name, attribute_name, iso_date_or_interval)

    def to_addr_str(self) -> str:
        component_arr = ["PARTIAL", self.case_uuid, self.iteration_name, self.surface_name, self.attribute_name]
        if self.iso_date_or_interval:
            component_arr.append(self.iso_date_or_interval)
        return "~".join(component_arr)


if __name__ == "__main__":
    print("Testing SurfAddr\n")

    # a0 = PartialSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", None)
    # a1 = PartialSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    # a0 = PartialSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "", "some.surface.name", "my_attr_name", "1997-07-02T00:00:00/2006-07-02T00:00:00")
    # a1 = PartialSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    a0 = RealSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", realization=1, iso_date_or_interval=None)
    a1 = PartialSurfAddr.from_addr_str(a0.to_addr_str())
    print(f"{type(a0)=}  {a0.to_addr_str()=}")
    print(f"{type(a1)=}  {a1=}")
