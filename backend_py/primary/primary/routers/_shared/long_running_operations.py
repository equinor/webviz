from typing import Generic, TypeVar, Literal

from pydantic import BaseModel


T = TypeVar("T")


class LroErrorInfo(BaseModel):
    message: str


class LroProgressInfo(BaseModel):
    progress_message: str


# Should we have a queued status?
# If so, what do we use as discriminator in LroInProgressResp
# Discriminator could be "in_progress" and true status could be: "queued" and "running"

# Rename operation_id to task_id?
# Should we get rid of the LroProgressInfo class and just use a progress_message property instead?
class LroInProgressResp(BaseModel):
    status: Literal["in_progress"]
    operation_id: str
    poll_url: str | None = None
    progress: LroProgressInfo | None = None


# Rename to LroFailureResp??
# 
#
class LroErrorResp(BaseModel):
    status: Literal["failure"]
    error: LroErrorInfo


class LroSuccessResp(BaseModel, Generic[T]):
    status: Literal["success"]
    data: T

