from pydantic import BaseModel
from typing import Any


class WellboreCompletion(BaseModel):
    md_top: float
    md_bottom: float
    tvd_top: float | None
    tvd_bottom: float | None
    description: str | None
    symbol_name: str | None
    comment: str | None


class WellboreCasing(BaseModel):
    item_type: str  # Casing type
    diameter_numeric: float
    diameter_inner: float
    description: str | None = None
    remark: str | None = None
    depth_top_md: float
    depth_bottom_md: float
    total_depth_md: float
    start_depth: float
    end_depth: float


class WellborePerforation(BaseModel):
    md_top: float
    md_bottom: float
    tvd_top: float
    tvd_bottom: float
    status: str
    completion_mode: str


class WellboreLogCurveHeader(BaseModel):
    log_name: str | None
    curve_name: str
    curve_unit: str | None

    # Defining a hash-function to facilitate usage in Sets
    def __hash__(self) -> int:
        # No globally unique field, but curve-name should be unique (per wellbore)
        return hash(self.curve_name + (self.log_name or "N/A"))

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, WellboreLogCurveHeader):
            # delegate to the other item in the comparison
            return NotImplemented

        return (self.curve_name, self.log_name) == (other.curve_name, other.log_name)


class WellboreLogCurveData(BaseModel):
    name: str
    index_min: float
    index_max: float
    min_curve_value: float
    max_curve_value: float
    curve_alias: str | None
    curve_description: str | None
    index_unit: str
    no_data_value: float | None
    unit: str
    curve_unit_desc: str | None
    DataPoints: list[list[float | None]]
