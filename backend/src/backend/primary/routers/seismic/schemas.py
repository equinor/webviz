from typing import List
from pydantic import BaseModel


class Seismic3DSurveyDirectory(BaseModel):
    attributes: List[str]
    timestamps: List[str]

    @classmethod
    def create_empty(cls) -> "Seismic3DSurveyDirectory":
        return cls(attributes=[], timestamps=[])


class Seismic4DSurveyDirectory(BaseModel):
    attributes: List[str]
    intervals: List[str]

    @classmethod
    def create_empty(cls) -> Seismic3DSurveyDirectory:
        return cls(attributes=[], intervals=[])
