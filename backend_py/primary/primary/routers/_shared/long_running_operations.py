from typing import Generic, TypeVar, Literal

from pydantic import BaseModel


T = TypeVar("T")


class LroErrorInfo(BaseModel):
    message: str


# Should we have a queued status?
# If so, what do we use as discriminator in LroInProgressResp
# Discriminator could be "in_progress" and true status could be: "queued" and "running"

# Rename operation_id to task_id?
#
class LroInProgressResp(BaseModel):
    status: Literal["in_progress"]
    operation_id: str
    poll_url: str | None = None
    progress_message: str | None = None


# Rename to LroFailureResp??
#
class LroErrorResp(BaseModel):
    status: Literal["failure"]
    error: LroErrorInfo


# Should the data property be renamed to avoid confusion?
# Maybe result?
#
class LroSuccessResp(BaseModel, Generic[T]):
    status: Literal["success"]
    data: T

