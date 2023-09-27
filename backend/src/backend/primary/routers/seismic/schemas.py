from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SeismicMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: Optional[str]
    is_observation: bool
    zmin: Optional[float]
    zmax: Optional[float]


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str
