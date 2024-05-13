from typing import List

from pydantic import BaseModel


class PvtData(BaseModel):
    name: str
    phase: str
    pvtnum: int
    ratio: list[float]
    pressure: List[float]
    volumefactor: List[float]
    viscosity: List[float]
    density: List[float]
    pressure_unit: str
    volumefactor_unit: str
    viscosity_unit: str
    density_unit: str
    ratio_unit: str
