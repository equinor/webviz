from enum import Enum
from typing import List, Optional, Any

from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray

from primary.services.smda_access.types import StratigraphicFeature

from .schemas import SurfaceAttributeType


# Surface addresses are used to identify a surface in Sumo
#
# realStaticAddr        caseUuid.ensembleName.surfaceName.attributeName.realization
# realTimePointAddr     caseUuid.ensembleName.surfaceName.attributeName.realization.timePoint
# realTimeIntervalAddr  caseUuid.ensembleName.surfaceName.attributeName.realization.timeInterval
# obsTimePointAddr      caseUuid.surfaceName.attributeName.timePoint
# obsTimeIntervalAddr   caseUuid.surfaceName.attributeName.timeInterval
#
# partialStaticAddr         caseUuid.ensembleName.surfaceName.attributeName
# partialTimePointAddr      caseUuid.ensembleName.surfaceName.attributeName.timePoint
# partialTimeIntervalAddr   caseUuid.ensembleName.surfaceName.attributeName.timeInterval
#

# Possible new routes using the address scheme
#
# getSurfaceData(surfAddr: string): SurfaceData
# getStatisticalSurfaceData(partialSurfAddr: string, realizations: list[int], statistical_functions: list[int]): list[SurfaceData]
#
# getDeltaSurfaceData(surfAddr1: string, surfAddr2: string): SurfaceData
# getDeltaStatisticalSurfaceData(partialSurfAddr1: string, realizations1: list[int], partialSurfAddr2: string, realizations2: list[int], statistical_functions: list[int]): list[SurfaceData]
#
# getMisfitSurfaceData(observedAddr: string, partialAddr: string, realizations: list[int], statistical_functions: list[int]): list[SurfaceData]


class SurfaceTimeType(Enum):
    NO_TIME = 1
    TIME_POINT = 2
    INTERVAL = 3


class SurfaceMeta(BaseModel):
    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool

    stratigraphic_identifier: Optional[str] = None  # Svarte fm.
    relative_stratigraphic_level: Optional[int] = None
    parent_stratigraphic_identifier: Optional[str] = None
    stratigraphic_feature: Optional[StratigraphicFeature] = None  # Distinguish between horizon and unit

    attribute_name: str
    attribute_type: SurfaceAttributeType
    time_type: SurfaceTimeType
    is_observation: bool  # Can only be true for seismic surfaces
    global_min_value: float | None = None
    global_max_value: float | None = None



# !!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!
# Two separate endpoints, one for observed, one for real
class SurfaceDirectory(BaseModel):
    surfaces: list[SurfaceMeta]
    time_points: list[str]
    time_intervals: list[str]
    sorted_surface_names: list[str]



class SurfaceDirectoryKladd(BaseModel):
    # All surfaces, with and without time and both real and observed
    surfaces: list[SurfaceMeta]

    # or
    # All real surfaces bundled together and all observed surfaces bundled together
    real_surfaces: list[SurfaceMeta]
    obs_surfaces: list[SurfaceMeta]

    # or
    # Split into real and observed and then split into static, time point and time interval
    real_static_surfaces: list[SurfaceMeta]
    real_time_point_surfaces: list[SurfaceMeta]
    real_time_interval_surfaces: list[SurfaceMeta]
    obs_time_point_surfaces: list[SurfaceMeta]
    obs_time_interval_surfaces: list[SurfaceMeta]

    # Strings or timestamps?
    real_time_points: list[str]
    real_time_intervals: list[str]
    obs_time_points: list[str]
    obs_time_intervals: list[str]

    stratigraphic_stuff: Any


"""
# From initial discussion with Hans
# ===============================================================================================
class SurfaceMeta(BaseModel):
    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool
    # stratigraphic_identifier: Optional[str] = None  # Svarte fm.
    # relative_stratigraphic_level: Optional[int] = None
    # parent_stratigraphic_identifier: Optional[str] = None
    # stratigraphic_feature: Optional[StratigraphicFeature] = None  # Distinguish between horizon and unit
    attribute_name: str
    attribute_type: SurfaceAttributeType
    
    # static, single, interval
    surface_type: Literal[static, single, interval]

    #iso_date_or_interval: Optional[str] = None

    is_observation: bool  # Can only be true for seismic surfaces
    value_min: Optional[float] = None
    value_max: Optional[float] = None

class StaticMetaData(BaseModel):
    surface_meta: list[SurfaceMeta]

class TimeDepMetaData(BaseModel):
    surface_meta: list[SurfaceMeta]
    time_stamps: list[str]

class TimeIntervalMetaData(BaseModel):
    surface_meta: list[SurfaceMeta]
    time_stamps: list[str]
    

class SurfaceDirectory(BaseModel):
    static_meta: StaticMetaData
    time_dep_meta: TimeDepMetaData
    time_interval_meta: TimeIntervalMetaData
    obs_time_dep_meta: TimeDepMetaData
    obs_time_interval_meta: TimeIntervalMetaData
    straigraphic_stuff


    static_surface_meta: list[SurfaceMeta]
    single_timestamp_surface_meta: list[SurfaceMeta]
    time_intervals_surface_meta: list[SurfaceMeta]
    obs_single_timestamp_surface_meta: list[SurfaceMeta]
    obs_time_intervals_surface_meta: list[SurfaceMeta]
    time_stamps: list[str]
    time_intervals: list[str]
    obs_time_stamps: list[str]
    obs_time_intervals: list[str]
    straigraphic_stuff
# ===============================================================================================
"""



