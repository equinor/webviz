from typing import Annotated, TypeVar
from enum import StrEnum

from pydantic import BaseModel
from pydantic import StringConstraints
from annotated_types import Len

T = TypeVar("T")

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
NonEmptyBytes = Annotated[bytes, Len(min_length=1)]
NonEmptyList = Annotated[list[T], Len(min_length=1)]


# Enumeration of the known worker operations
# These represent the possible values for the "subject" field in ServiceBus messages
class WorkerOperation(StrEnum):
    DEV_TEST = "dev-test"
    CREATE_COMBINED_VECTOR_TABLE = "create-combined-vector-table"
    QC_HYDROSTATIC_EQUIL_VECTOR_CHECK = "qc-hydrostatic-equil-vector-check"
    QC_HYDROSTATIC_EQUIL_GRID_PROPERTY_CHECK = "qc-hydrostatic-equil-grid-property-check"


# Base class for tracked user tasks.
# These are tasks that are associated with a specific user and can be tracked using the TaskMetaTracker.
class UserTaskMsgHeader(BaseModel):
    user_id: NonEmptyStr
    task_id: NonEmptyStr


# Dummy dev test message to test scaffolding
class DevTestMsg(BaseModel):
    text: NonEmptyStr
    encrypted_text: NonEmptyBytes
    sleep_duration_s: float


class CreateCombinedVectorTableMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    vector_names: NonEmptyList[NonEmptyStr]
    encrypted_access_token: NonEmptyBytes


class QcHydrostaticEquilVectorCheckMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    t0_iso: NonEmptyStr
    t1_iso: NonEmptyStr
    realizations: list[int] | None
    encrypted_access_token: NonEmptyBytes


class QcHydrostaticEquilGridPropertyCheckMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    grid_name: NonEmptyStr
    realization: int
    encrypted_access_token: NonEmptyBytes
