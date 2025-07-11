from typing import Sequence

from pydantic import BaseModel


class FieldInfo(BaseModel):
    fieldIdentifier: str


class EnsembleIdent(BaseModel):
    caseUuid: str
    ensembleName: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str
    updatedAtUtcMs: int


class EnsembleTimestamps(BaseModel):
    caseUpdatedAtUtcMs: int
    dataUpdatedAtUtcMs: int


class EnsembleInfo(BaseModel):
    name: str
    realizationCount: int
    timestamps: EnsembleTimestamps


class EnsembleDetails(BaseModel):
    name: str
    fieldIdentifier: str
    caseName: str
    caseUuid: str
    realizations: Sequence[int]
    stratigraphicColumnIdentifier: str
    timestamps: EnsembleTimestamps
