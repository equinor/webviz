from typing import Generic, TypeVar, Literal

from pydantic import BaseModel, ConfigDict

ResultT = TypeVar("ResultT")


class LroRespBaseModel(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


# The poll_url is optional and will typically be used in a post/pull scenario where the client has posted a task
# to be performed and should then do polling on the given URL for updates.
# For hybrid endpoints (e.g. GET that may trigger a long-running operation) the poll_url will usually may be None,
# in which case the client should poll the same URL as the original request.
#
# Possible extensions to the progress response:
# * Should there be any information regarding when a task was originally submitted?
class LroInProgressResp(LroRespBaseModel):
    response_type: Literal["LroInProgressResp"] = "LroInProgressResp"
    status: Literal["in_progress"]
    task_id: str
    poll_url: str | None = None
    progress_message: str | None = None


class LroFailureResp(LroRespBaseModel):
    response_type: Literal["LroFailureResp"] = "LroFailureResp"
    task_id: str | None = None
    error_message: str | None = None


class LroSuccessResp(LroRespBaseModel, Generic[ResultT]):
    response_type: Literal["LroSuccessResp"] = "LroSuccessResp"
    result: ResultT


class LroCommandResp(LroRespBaseModel):
    response_type: Literal["LroCommandResp"] = "LroCommandResp"
    command_ok: bool
    error_message: str | None = None
