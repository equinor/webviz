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
