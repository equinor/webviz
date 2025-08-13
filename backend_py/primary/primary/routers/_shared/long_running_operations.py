from typing import Generic, TypeVar, Literal

from pydantic import BaseModel


T = TypeVar("T")


class LroErrorInfo(BaseModel):
    message: str


# * Should we have a queued status?
#   If so, what do we use as discriminator in LroInProgressResp?
#   Discriminator could be "in_progress" and true status could be: "queued" and "running"
# * Should there be any information regarding when a task was submitted?
class LroInProgressResp(BaseModel):
    status: Literal["in_progress"]
    task_id: str
    poll_url: str | None = None
    progress_message: str | None = None


class LroFailureResp(BaseModel):
    status: Literal["failure"]
    error: LroErrorInfo


class LroSuccessResp(BaseModel, Generic[T]):
    status: Literal["success"]
    result: T
