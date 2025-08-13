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
    # description: str
    # standardResults: Sequence[str]

    # date: str # NOTE: Which date should be provide for a case? "Create", "Last updated/modified", "newest date for a document for one of the ensembles"
    # description: str
    # standard_results: Sequence[str]

class EnsembleTimestamps(BaseModel):
    caseUpdatedAtUtcMs: int
    dataUpdatedAtUtcMs: int


class EnsembleInfo(BaseModel):
    name: str
    realizationCount: int
    timestamps: EnsembleTimestamps

    # standard_results: Sequence[str]


class EnsembleDetails(BaseModel):
    name: str
    fieldIdentifier: str
    caseName: str
    caseUuid: str
    realizations: Sequence[int]
    stratigraphicColumnIdentifier: str
    timestamps: EnsembleTimestamps

    # standard_results: Sequence[str]
