from typing import List, Sequence

from pydantic import BaseModel


class FieldInfo(BaseModel):
    field_identifier: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str


class EnsembleInfo(BaseModel):
    name: str
    realization_count: int


class EnsembleDetails(BaseModel):
    name: str
    field_identifier: str
    case_name: str
    case_uuid: str
    realizations: Sequence[int]
