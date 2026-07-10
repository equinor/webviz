from typing import Annotated, TypeVar
from enum import StrEnum

from pydantic import BaseModel
from pydantic import StringConstraints
from annotated_types import Len

T = TypeVar("T")

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
NonEmptyBytes = Annotated[bytes, Len(min_length=1)]
NonEmptyList = Annotated[list[T], Len(min_length=1)]


class WorkerOperation(StrEnum):
    DUMMY = "dummy"
    CREATE_DERIVED_SMRY_TABLE = "create-derived-smry-table"
    QC_CHECK_HYDROSTATIC_EQUIL_VECTORS = "qc-check-hydrostatic-equil-vectors"
    QC_CHECK_HYDROSTATIC_EQUIL_GRID_PROPERTIES = "qc-check-hydrostatic-equil-grid-properties"


class UserTaskMsgHeader(BaseModel):
    user_id: NonEmptyStr
    task_id: NonEmptyStr


class CreateDerivedSmryTableMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    vector_names: NonEmptyList[NonEmptyStr]
    encrypted_access_token: NonEmptyBytes


class QcCheckHydrostaticEquilVectorsMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    t0_iso_str: NonEmptyStr # ISO date string of the t0 (initial) time step
    t1_iso_str: NonEmptyStr # ISO date string of the t1 (later) time step
    encrypted_access_token: NonEmptyBytes


class QcHydrostaticEquilGridPropertiesMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    grid_name: NonEmptyStr
    realization: int
    encrypted_access_token: NonEmptyBytes
