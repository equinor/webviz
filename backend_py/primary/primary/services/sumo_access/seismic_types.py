from pydantic import BaseModel


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool
    i_min: int
    i_max: int
    j_min: int
    j_max: int
    k_min: int
    k_max: int
    z_min: float
    z_max: float


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str
