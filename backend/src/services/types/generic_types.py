from typing import List

from pydantic import BaseModel


class EnsembleScalarResponse(BaseModel):
    realizations: List[int]
    values: List[float]


class EnsembleCorrelations(BaseModel):
    names: List[str]
    values: List[float]


class SumoTableSchema(BaseModel):
    """The necessary information to query Sumo for a specific table
    Needs discussion."""

    name: str  # For summary this would be "summary". For e.g. PVT, Relperm it would be DROGON-<realization>
    tagname: str  # For summary this would be e.g. "eclipse". For PVT it would be PVT. ...
    column_names: List[str]
    # context?
    # stage? (realization, iteration, collection)
