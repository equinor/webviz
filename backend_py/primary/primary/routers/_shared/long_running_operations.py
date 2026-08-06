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
    task_id: str
    poll_url: str | None = None
    status_str: Literal["pending", "running"] | str
    progress_message: str | None = None


class LroFailureResp(LroRespBaseModel):
    response_type: Literal["LroFailureResp"] = "LroFailureResp"
    task_id: str | None = None
    error_message: str | None = None


class LroSuccessResp(LroRespBaseModel, Generic[ResultT]):
    response_type: Literal["LroSuccessResp"] = "LroSuccessResp"
    result: ResultT


# This response is NOT part of the standard LRO response types and flow, but is used for certain one-shot command-like
# operations that may be issued to the server outside of the standard LRO flow. For example, a command to delete a
# task may be issued and the server may respond with a LroCommandResp
class LroCommandResp(LroRespBaseModel):
    response_type: Literal["LroCommandResp"] = "LroCommandResp"
    command_ok: bool
    message: str | None = None
