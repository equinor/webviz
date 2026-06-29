from typing import Annotated, TypeVar
from annotated_types import Len

from pydantic import BaseModel
from pydantic import StringConstraints

T = TypeVar("T")

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
NonEmptyBytes = Annotated[bytes, Len(min_length=1)]
NonEmptyList = Annotated[list[T], Len(min_length=1)]


class UserTaskMsgHeader(BaseModel):
    user_id: NonEmptyStr
    task_id: NonEmptyStr


class CreateDerivedSmryTableMsg(UserTaskMsgHeader):
    case_uuid: NonEmptyStr
    ensemble_name: NonEmptyStr
    vector_names: NonEmptyList[NonEmptyStr]
    encrypted_access_token: NonEmptyBytes
