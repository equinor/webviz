from typing import List

from pydantic import BaseModel


class EnsembleScalarResponse(BaseModel):
    """ """

    realizations: List[int]
    values: List[float]


class EnsembleCorrelations(BaseModel):
    names: List[str]
    values: List[float]
