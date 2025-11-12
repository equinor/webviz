import logging
import time
from hashlib import sha256

from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.sumo_access.surface_access import ExpectedError, InProgress, SurfaceAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.statistic_function import StatisticFunction
from webviz_services.utils.task_meta_tracker import TaskMeta, TaskMetaTracker

from .._shared.long_running_operations import LroErrorInfo, LroFailureResp, LroInProgressResp
from .surface_address import StatisticalSurfaceAddress

LOGGER = logging.getLogger(__name__)


async def determine_surf_task_fingerprint_async(
    authenticated_user: AuthenticatedUser, addr: StatisticalSurfaceAddress
) -> str:
    # For how long should we cache the ensemble fingerprint here?
    # Note that the explore endpoint that calculates/refreshes fingerprints sets a TTL of 5 minutes.
    # Be a bit defensive here and set a TTL of 2 minutes.
    fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)

    ensemble_fp = await fingerprinter.get_or_calc_ensemble_fp_async(addr.case_uuid, addr.ensemble_name)

    # Note that we include the ensemble fingerprint in the task hash/fingerprint
    task_fp = sha256((addr.to_addr_str() + ensemble_fp).encode()).hexdigest()

    return task_fp


async def submit_and_track_stat_surf_task_async(
    access: SurfaceAccess, addr: StatisticalSurfaceAddress, task_tracker: TaskMetaTracker, task_fingerprint: str
) -> TaskMeta:
    task_start_time_utc_s = time.time()

    sumo_task_id = await access.submit_statistical_surface_calculation_task_async(
        statistic_function=StatisticFunction.from_string_value(addr.stat_function),
        name=addr.name,
        attribute=addr.attribute,
        realizations=addr.stat_realizations,
        time_or_interval_str=addr.iso_time_or_interval,
    )

    # According to Sumo team, the tasks and task results will be purged after 24 hours, so we set our TTL slightly shorter at 23 hours
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
    task_meta: TaskMeta, task_just_submitted: bool, prog_obj_from_access: InProgress
) -> LroInProgressResp:
    elapsed_time_s = time.time() - task_meta.start_time_utc_s
    if task_just_submitted:
        prog_msg = f"New task submitted: {prog_obj_from_access.progress_message}"
    else:
        prog_msg = f"Sumo task status: {prog_obj_from_access.progress_message} ({elapsed_time_s:.1f}s elapsed)"

    return LroInProgressResp(status="in_progress", task_id=task_meta.task_id, progress_message=prog_msg)


def make_lro_failure_resp(err_obj_from_access: ExpectedError) -> LroFailureResp:
    return LroFailureResp(status="failure", error=LroErrorInfo(message=err_obj_from_access.message))
