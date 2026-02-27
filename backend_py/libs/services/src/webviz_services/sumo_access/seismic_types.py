from enum import StrEnum

from pydantic import BaseModel


class SeismicCubeSpec(BaseModel):
    num_cols: int
    num_rows: int
    num_layers: int
    x_origin: float
    y_origin: float
    z_origin: float
    x_inc: float
    y_inc: float
    z_inc: float
    y_flip: int
    z_flip: int
    rotation: float


class SeismicCubeBoundingBox(BaseModel):
    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float


class SeismicRepresentation(StrEnum):
    OBSERVED_IN_CASE = "observed_case"
    OBSERVED_IN_REALIZATION = "observed_realization"
    MODELLED = "modelled"


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    unit: str
    iso_date_or_interval: str
    representation: SeismicRepresentation
    is_depth: bool
    bbox: SeismicCubeBoundingBox
    spec: SeismicCubeSpec


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str
