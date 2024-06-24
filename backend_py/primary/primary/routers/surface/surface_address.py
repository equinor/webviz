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




def parse_int_list_string(int_arr_str: str) -> list[int]:
    """
    Parse a string containing an array of comma separated integers and integer ranges.
    """
    elements = int_arr_str.split(',')
    int_arr: list[int] = []
    for element in elements:
        if '-' in element:
            start, end = element.split('-')
            start, end = int(start), int(end)
            int_arr.extend(range(start, end + 1))
        else:
            int_arr.append(int(element))
    
    ret_arr = sorted(set(int_arr))

    return ret_arr


def encode_int_list_to_string(int_list: list[int]) -> str:
    """
    Encode a list of integers into a string, utilizing ranges to make it more compact
    """
    if not int_list:
        return ""
    
    # Remove duplicates and sort
    int_list = sorted(set(int_list))  

    encoded_parts = []
    start_val = int_list[0]
    end_val = start_val
    
    for val in int_list[1:]:
        if val == end_val + 1:
            end_val = val
        else:
            if start_val == end_val:
                encoded_parts.append(f"{start_val}")
            else:
                encoded_parts.append(f"{start_val}-{end_val}")
            start_val = val
            end_val = val
    
    # Add the last one
    if start_val == end_val:
        encoded_parts.append(f"{start_val}")
    else:
        encoded_parts.append(f"{start_val}-{end_val}")
    
    return ','.join(encoded_parts)




# // Parse page ranges into array of numbers
# function parseRealizationRangeString(realRangeStr: string, maxLegalReal: number): number[] {
#     const realArr: number[] = [];

#     const rangeArr = realRangeStr.split(",");
#     for (const aRange of rangeArr) {
#         const rangeParts = aRange.split("-");
#         if (rangeParts.length === 1) {
#             const real = parseInt(rangeParts[0], 10);
#             if (real >= 0 && real <= maxLegalReal) {
#                 realArr.push(real);
#             }
#         } else if (rangeParts.length === 2) {
#             const startReal = parseInt(rangeParts[0], 10);
#             const endReal = parseInt(rangeParts[1], 10);
#             if (startReal >= 0 && startReal <= maxLegalReal && endReal >= startReal) {
#                 for (let i = startReal; i <= Math.min(endReal, maxLegalReal); i++) {
#                     realArr.push(i);
#                 }
#             }
#         }
#     }

#     // Sort and remove duplicates
#     return sortedUniq(sortBy(realArr));
# }


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

    # a0 = RealSurfAddr("88f940d4-e57b-44ce-8e62-b3e30cf2c1ec", "iter-0", "some.surface.name", "my_attr_name", realization=1, iso_date_or_interval=None)
    # a1 = RealSurfAddr.from_addr_str(a0.to_addr_str())
    # print(f"{type(a0)=}  {a0.to_addr_str()=}")
    # print(f"{type(a1)=}  {a1=}")

    print(parse_int_list_string("1,2,3-6,1,6-8"))

    int_list = [1,2,3,10,5,7,8,1,-2,-3]
    as_str = encode_int_list_to_string(int_list)
    back_to_list = parse_int_list_string(as_str)
    print(f"{int_list=}")
    print(f"{as_str=}")
    print(f"{back_to_list=}")
