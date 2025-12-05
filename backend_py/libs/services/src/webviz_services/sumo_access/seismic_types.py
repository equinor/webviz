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


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    unit: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool
    bbox: SeismicCubeBoundingBox
    spec: SeismicCubeSpec


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str
