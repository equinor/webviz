from typing import Sequence

from pydantic import BaseModel


class FieldInfo(BaseModel):
    field_identifier: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str
    updated_at_utc_ms: int


class EnsembleTimestamps(BaseModel):
    case_updated_at_utc_ms: int
    data_updated_at_utc_ms: int


class EnsembleInfo(BaseModel):
    name: str
    realization_count: int
    timestamps: EnsembleTimestamps


class EnsembleDetails(BaseModel):
    name: str
    field_identifier: str
    case_name: str
    case_uuid: str
    realizations: Sequence[int]
    stratigraphic_column_identifier: str
    timestamps: EnsembleTimestamps
