import logging
import time
from hashlib import sha256

from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.sumo_access.summary_access import SummaryAccess, SummaryInProgress, SummaryExpectedError
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.task_meta_tracker import TaskMeta, TaskMetaTracker

from .._shared.long_running_operations import LroErrorInfo, LroFailureResp, LroInProgressResp

LOGGER = logging.getLogger(__name__)


async def determine_summary_task_fingerprint_async(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    vector_names: list[str],
) -> str:
    fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)
    ensemble_fp = await fingerprinter.get_or_calc_ensemble_fp_async(case_uuid, ensemble_name)

    # Deterministic hash: sorted vector names + ensemble fingerprint
    sorted_names = ",".join(sorted(vector_names))
    raw = f"{case_uuid}:{ensemble_name}:{sorted_names}:{ensemble_fp}"
    return sha256(raw.encode()).hexdigest()


async def submit_and_track_summary_task_async(
    access: SummaryAccess,
    vector_names: list[str],
    task_tracker: TaskMetaTracker,
    task_fingerprint: str,
) -> TaskMeta:
    task_start_time_utc_s = time.time()

    sumo_task_id = await access.submit_batch_aggregation_task_async(vector_names)

    # Sumo purges tasks after 24h — set TTL slightly shorter
    task_ttl_s = 23 * 60 * 60
    task_meta = await task_tracker.register_task_with_fingerprint_async(
        task_system="sumo_task",
        task_id=sumo_task_id,
        fingerprint=task_fingerprint,
        ttl_s=task_ttl_s,
        task_start_time_utc_s=task_start_time_utc_s,
        expected_store_key=None,
    )

    return task_meta


def make_lro_in_progress_resp(
    task_meta: TaskMeta, task_just_submitted: bool, prog_obj: SummaryInProgress
) -> LroInProgressResp:
    elapsed_time_s = time.time() - task_meta.start_time_utc_s
    if task_just_submitted:
        prog_msg = f"New batch aggregation task submitted: {prog_obj.progress_message}"
    else:
        prog_msg = f"Sumo task status: {prog_obj.progress_message} ({elapsed_time_s:.1f}s elapsed)"

    return LroInProgressResp(status="in_progress", task_id=task_meta.task_id, progress_message=prog_msg)


def make_lro_failure_resp(err_obj: SummaryExpectedError) -> LroFailureResp:
    return LroFailureResp(status="failure", error=LroErrorInfo(message=err_obj.message))
