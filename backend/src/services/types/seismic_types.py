from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class SeismicCubeSchema(BaseModel):
    name: str
    description: Optional[str]
    timestamps: Optional[List[str]]
    timesteps: Optional[List[str]]


class SeismicCubeVdsHandle(BaseModel):
    sas_token: str
    vds_url: str
