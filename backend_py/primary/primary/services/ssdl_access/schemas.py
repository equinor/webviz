from pydantic import BaseModel


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


class WellboreLogCurveInfo(BaseModel):
    log_name: str
    curve_name: str
    curve_unit: str


class WellboreLogCurveData(BaseModel):
    index_min: float
    index_max: str
    min_curve_value: float
    max_curve_value: float
    DataPoints: list[list[float | None]]
    curve_alias: str
    curve_description: str
    index_unit: str
    no_data_value: float
