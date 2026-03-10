import time
from typing import Generic, TypeVar, Literal

from pydantic import BaseModel

from webviz_services.sumo_access._sumo_task_utils import SumoTaskError, SumoTaskInProgress
from webviz_services.utils.task_meta_tracker import TaskMeta

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


def make_lro_in_progress_resp(
    task_meta: TaskMeta,
    task_just_submitted: bool,
    prog_obj: SumoTaskInProgress,
    task_label: str = "task",
) -> LroInProgressResp:
    """Build a standard in-progress LRO response from a Sumo task progress object."""
    elapsed_time_s = time.time() - task_meta.start_time_utc_s
    if task_just_submitted:
        prog_msg = f"New {task_label} submitted: {prog_obj.progress_message}"
    else:
        prog_msg = f"Sumo task status: {prog_obj.progress_message} ({elapsed_time_s:.1f}s elapsed)"
    return LroInProgressResp(status="in_progress", task_id=task_meta.task_id, progress_message=prog_msg)


def make_lro_failure_resp(err_obj: SumoTaskError) -> LroFailureResp:
    """Build a standard failure LRO response from a Sumo task error object."""
    return LroFailureResp(status="failure", error=LroErrorInfo(message=err_obj.message))
