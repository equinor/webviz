from typing import Generic, TypeVar, Literal

from pydantic import BaseModel


ResultT = TypeVar("ResultT")


# The poll_url is optional and will typically be used in a post/pull scenario where the client has posted a task
# to be performed and should then do polling on the given URL for updates.
# For hybrid endpoints (e.g. GET that may trigger a long-running operation) the poll_url will usually may be None,
# in which case the client should poll the same URL as the original request.
#
# Possible extensions to the progress response:
# * Should there be any information regarding when a task was originally submitted?
class LroInProgressResp(BaseModel):
    status: Literal["in_progress"]
    task_id: str
    poll_url: str | None = None
    progress_message: str | None = None


class LroErrorInfo(BaseModel):
    message: str


class LroFailureResp(BaseModel):
    status: Literal["failure"]
    error: LroErrorInfo


class LroSuccessResp(BaseModel, Generic[ResultT]):
    status: Literal["success"]
    result: ResultT
