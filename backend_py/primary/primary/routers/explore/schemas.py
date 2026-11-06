from typing import Sequence

from pydantic import BaseModel


class AssetInfo(BaseModel):
    name: str


class FieldInfo(BaseModel):
    fieldIdentifier: str


class EnsembleIdent(BaseModel):
    caseUuid: str
    ensembleName: str


class EnsembleInfo(BaseModel):
    name: str
    realizationCount: int
    standardResults: Sequence[str]


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str
    updatedAtUtcMs: int
    description: str
    modelName: str | None
    modelRevision: str | None
    ensembles: Sequence[EnsembleInfo]


class EnsembleTimestamps(BaseModel):
    caseUpdatedAtUtcMs: int
    dataUpdatedAtUtcMs: int


class FipRegion(BaseModel):
    fipNumber: int
    zone: str
    region: str


class RestartFromEnsemble(BaseModel):
    caseUuid: str
    caseName: str
    ensembleName: str


class EnsembleDetails(BaseModel):
    name: str
    assetName: str
    fieldIdentifiers: list[str]
    caseName: str
    caseUuid: str
    realizations: Sequence[int]
    stratigraphicColumnIdentifier: str
    standardResults: Sequence[str]
    fipRegions: Sequence[FipRegion]
    restartFromChain: list[RestartFromEnsemble]  # nearest parent first
    restartFromUnresolvedUuid: str | None  # set if the restart chain broke on an ensemble that could not be found


class EnsembleRestartInfo(BaseModel):
    ensembleName: str
    restartFrom: RestartFromEnsemble | None
    restartFromUnresolvedUuid: str | None
