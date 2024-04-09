from pydantic import BaseModel


class WellBoreCasing(BaseModel):
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


class WellBoreLogCurveInfo(BaseModel):
    log_name: str
    curve_name: str
    curve_unit: str


class WellBoreLogCurveData(BaseModel):
    index_min: float
    index_max: str
    min_curve_value: float
    max_curve_value: float
    DataPoints: list[list[float | None]]
    curve_alias: str
    curve_description: str
    index_unit: str
    no_data_value: float
