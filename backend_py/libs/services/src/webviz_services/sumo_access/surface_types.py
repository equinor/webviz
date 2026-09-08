from dataclasses import dataclass
from enum import Enum
from typing import ClassVar, Literal, TypeAlias

from fmu.datamodels.fmu_results.enums import FluidContactType
from fmu.datamodels.standard_results.enums import StandardResultName

from .generic_types import SumoContent
from .queries.surface_queries import SurfTimeType


class SurfaceStandardResult(str, Enum):
    """The subset of FMU standard results that are surfaces."""

    FLUID_CONTACT_SURFACE = StandardResultName.fluid_contact_surface.value
    GRID_EXTRACTED_DEPTH_SURFACE = StandardResultName.grid_extracted_depth_surface.value
    STRUCTURE_DEPTH_FAULT_SURFACE = StandardResultName.structure_depth_fault_surface.value
    STRUCTURE_DEPTH_ISOCHORE = StandardResultName.structure_depth_isochore.value
    STRUCTURE_DEPTH_SURFACE = StandardResultName.structure_depth_surface.value
    STRUCTURE_TIME_SURFACE = StandardResultName.structure_time_surface.value


@dataclass(frozen=True)
class TagNameAttribute:
    """Identifies a surface by the free text tagname it was exported with."""

    attribute_type: ClassVar[Literal["TAGNAME"]] = "TAGNAME"
    tag_name: str


@dataclass(frozen=True)
class StdResAttribute:
    """Identifies a surface by the FMU standard result it belongs to.

    The sub_name discriminates between surfaces within a standard result, e.g. the contact
    type for fluid_contact_surface. It is None for standard results that do not need it.
    """

    attribute_type: ClassVar[Literal["STDRES"]] = "STDRES"
    std_res_name: SurfaceStandardResult
    sub_name: str | None


SurfaceAttribute: TypeAlias = TagNameAttribute | StdResAttribute


# Sumo field holding the value that a sub_name is matched against, per standard result.
# Standard results without an entry here do not support a sub_name.
STD_RES_SUB_NAME_FIELD: dict[SurfaceStandardResult, str] = {
    SurfaceStandardResult.FLUID_CONTACT_SURFACE: "data.fluid_contact.contact.keyword",
}


@dataclass(frozen=True, kw_only=True)
# pylint: disable=too-many-instance-attributes
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


@dataclass(frozen=True, kw_only=True)
class InitialFluidContactSurfaceMeta:
    name: str
    contact: FluidContactType
    is_stratigraphic: bool
    global_min_val: float | None
    global_max_val: float | None
