from typing import List

from pydantic import BaseModel


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str


class SeismicIntersectionData(BaseModel):
    values_arr_str: str
    z_arr_str: str
