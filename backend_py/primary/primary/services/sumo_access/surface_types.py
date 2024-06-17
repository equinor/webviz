from dataclasses import dataclass

from .generic_types import SumoContent
from .queries.surface_queries import SurfTimeType


@dataclass(frozen=True, kw_only=True)
class SurfaceMeta:
    name: str
    attribute_name: str
    content: SumoContent
    time_type: SurfTimeType
    is_observation: bool
    is_stratigraphic: bool
    global_min_val: float | None
    global_max_val: float | None


@dataclass(frozen=True, kw_only=True)
class SurfaceMetaSet:
    surfaces: list[SurfaceMeta]
    time_points_iso_str: list[str]
    time_intervals_iso_str: list[str]
