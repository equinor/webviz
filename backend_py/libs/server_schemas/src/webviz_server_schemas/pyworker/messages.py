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