from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class SeismicCubeSchema(BaseModel):
    name: str
    description: Optional[str]
    timestamps: Optional[List[str]]
    timesteps: Optional[List[str]]


class Seismic3DSurveyDirectory(BaseModel):
    attributes: List[str]
    timestamps: List[str]

    @classmethod
    def create_empty(cls) -> Seismic3DSurveyDirectory:
        return cls(attributes=[], timestamps=[])


class Seismic4DSurveyDirectory(BaseModel):
    attributes: List[str]
    intervals: List[str]  # baseline - monitor

    @classmethod
    def create_empty(cls) -> Seismic3DSurveyDirectory:
        return cls(attributes=[], intervals=[])
