import asyncio
import datetime
import logging
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response

from webviz_core_utils.background_tasks import run_in_background_task
from webviz_services.user_session_manager.user_session_manager import UserSessionManager
from webviz_services.user_session_manager.user_session_manager import UserComponent
from webviz_services.user_session_manager.user_session_manager import _USER_SESSION_DEFS
from webviz_services.user_session_manager._radix_helpers import RadixResourceRequests, RadixJobApi
from webviz_services.user_session_manager._user_session_directory import UserSessionDirectory
from webviz_services.user_grid3d_service.user_grid3d_service import UserGrid3dService, IJKIndexFilter
from webviz_services.service_exceptions import Service, ServiceUnavailableError, ServiceRequestError
from webviz_services.utils.otel_span_tracing import start_otel_span_async
from webviz_services.utils.task_meta_tracker import get_task_meta_tracker_for_user

from primary.auth.auth_helper import AuthenticatedUser, AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics

LOGGER = logging.getLogger(__name__)


router = APIRouter()


ErrorTypes = Literal[
    "TypeError", "ValueError", "ServiceUnavailableError", "NestedValueError", "HttpException", "NoError"
]


@router.get("/provoke_error/{error_type}")
async def get_provoke_error(
    # fmt:off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    error_type: Annotated[ErrorTypes, Path(description="The error type to throw")],
    use_span: Annotated[bool, Query(description="Whether to use an OpenTelemetry span when trhowing error")] = False,
    status_code: Annotated[int, Query(description="Status code to use when throwing HttpException")] = 400,
    # fmt:on
) -> str:
    # A validation error can be provoked by passing an invalid value for error_type
    LOGGER.info(f"About to provoke error of type {error_type=}")

    if use_span:
        async with start_otel_span_async("my-fake-span") as span:
            _my_provoking_function(error_type, status_code)
    else:
        _my_provoking_function(error_type, status_code)

    # We will only end up here, with a 200 reply, if the specified exception type is unrecognized
    return f"This is a 200 OK response!\n\nOoops, couldn't throw exception {error_type=}"


def _my_provoking_function(error_type: ErrorTypes, status_code: int) -> None:
    if error_type == "TypeError":
        raise TypeError("This is a dummy type error")

    elif error_type == "ValueError":
        raise ValueError("This is a dummy value error")

    elif error_type == "ServiceUnavailableError":
        raise ServiceUnavailableError("Dummy message for SUMO service unavailable error", Service.SUMO)

    elif error_type == "NestedValueError":
        try:
            _always_throws_error()
        except ValueError as exc:
            raise ServiceRequestError("Service request error as a result of ValueError", Service.SUMO) from exc

    elif error_type == "HttpException":
        raise HTTPException(status_code=status_code, detail="My dummy HTTP error")


def _always_throws_error() -> None:
    raise ValueError("This is a dummy nested value error from _always_throws_error()")


@router.get("/tasks/purge")
async def get_tasks_purge(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    perf_metrics = ResponsePerfMetrics(response)
    LOGGER.debug(f"get_tasks_purge() - start")

    task_tracker = get_task_meta_tracker_for_user(authenticated_user)
    await task_tracker.purge_all_task_meta_async()

    LOGGER.debug(f"get_tasks_purge() - done in {perf_metrics.to_string()}")

    return f"All tasks purged in {perf_metrics.to_string()}"


@router.get("/usersession/{user_component}/call")
async def get_usersession_call(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: Annotated[UserComponent, Path(description="User session component")],
    instance_str: Annotated[str, Query(description="Instance string")] = "myInst",
) -> str:
    LOGGER.debug(f"usersession_call() {user_component=}, {instance_str=}")
    LOGGER.debug(f"usersession_call() {authenticated_user.get_user_id()=}, {authenticated_user.get_username()=}")

    manager = UserSessionManager(authenticated_user.get_user_id(), authenticated_user.get_username())
    session_base_url = await manager.get_or_create_session_async(user_component, instance_str)
    if session_base_url is None:
        LOGGER.error("Failed to get user session URL")
        raise HTTPException(status_code=500, detail="Failed to get user session URL")

    endpoint = f"{session_base_url}/dowork?duration=5"

    LOGGER.debug("======================")
    LOGGER.debug(f"{session_base_url=}")
    LOGGER.debug(f"{endpoint=}")
    LOGGER.debug("======================")

    LOGGER.debug(f"before call to: {endpoint=}")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(endpoint)
        response.raise_for_status()

    LOGGER.debug(f"after call to: {endpoint=}")

    resp_text = response.text
    LOGGER.debug(f"{type(resp_text)=}")
    LOGGER.debug(f"{resp_text=}")

    return resp_text


@router.get("/usersession/{user_component}/radixlist")
async def get_usersession_radixlist(user_component: UserComponent) -> list:
    LOGGER.debug(f"usersession_radixlist() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]
    radix_job_api = RadixJobApi(session_def.job_component_name, session_def.port)

    job_list = await radix_job_api.get_all_jobs()

    LOGGER.debug("======================")
    LOGGER.debug(job_list)
    LOGGER.debug("======================")

    return job_list


@router.get("/usersession/{user_component}/radixcreate")
async def get_usersession_radixcreate(user_component: UserComponent) -> str:
    LOGGER.debug(f"usersession_radixcreate() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]
    radix_job_api = RadixJobApi(session_def.job_component_name, session_def.port)
    resource_req = RadixResourceRequests(cpu="50m", memory="100Mi")
    new_radix_job_name = await radix_job_api.create_new_job(
        resource_req=resource_req, job_id="dummyJobId", payload_dict=None
    )
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    LOGGER.debug(f"Polling job until receiving running status: {new_radix_job_name=}")
    max_state_calls = 20
    for _i in range(max_state_calls):
        radix_job_state = await radix_job_api.get_job_state(new_radix_job_name)
        session_status = radix_job_state.status if radix_job_state else "N/A"
        LOGGER.debug(f"Status: {session_status=}")
        await asyncio.sleep(0.1)

    return str(radix_job_state)


@router.get("/usersession/{user_component}/radixdelete")
async def get_usersession_radixdelete(user_component: UserComponent) -> str:
    LOGGER.debug(f"usersession_radixdelete() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]
    radix_job_api = RadixJobApi(session_def.job_component_name, session_def.port)

    await radix_job_api.delete_all_jobs()

    return "Delete done"


@router.get("/usersession/dirlist")
async def get_usersession_dirlist(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: UserComponent | None = None,
) -> list:
    LOGGER.debug(f"usersession_dirlist() {user_component=}")

    job_component_name: str | None = None
    if user_component is not None:
        job_component_name = _USER_SESSION_DEFS[user_component].job_component_name

    session_dir = UserSessionDirectory(authenticated_user.get_user_id())
    session_info_arr = session_dir.get_session_info_arr(job_component_name)

    LOGGER.debug("======================")
    for session_info in session_info_arr:
        LOGGER.debug(f"{session_info=}")
    LOGGER.debug("======================")

    return session_info_arr


@router.get("/usersession/dirdel")
async def get_usersession_dirdel(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: UserComponent | None = None,
) -> str:
    LOGGER.debug(f"usersession_dirdel() {user_component=}")

    job_component_name: str | None = None
    if user_component is not None:
        job_component_name = _USER_SESSION_DEFS[user_component].job_component_name

    session_dir = UserSessionDirectory(authenticated_user.get_user_id())
    session_dir.delete_session_info(job_component_name)

    session_info_arr = session_dir.get_session_info_arr(None)
    LOGGER.debug("======================")
    for session_info in session_info_arr:
        LOGGER.debug(f"{session_info=}")
    LOGGER.debug("======================")

    return "Session info deleted"


@router.get("/bgtask")
async def get_bgtask() -> str:
    LOGGER.debug(f"bgtask() - start")

    async def funcThatThrows() -> None:
        raise ValueError("This is a test error")

    async def funcThatLogs(msg: str) -> None:
        LOGGER.debug(f"This is a test log {msg=}")

    run_in_background_task(funcThatThrows())
    run_in_background_task(funcThatLogs(msg="HELO HELLO"))

    LOGGER.debug(f"bgtask() - done")

    return "Background tasks were run"


@router.get("/longtask/{duration_s}")
async def get_longtask(duration_s: int) -> str:
    LOGGER.debug(f"get_longtask() {duration_s=} - start")

    await asyncio.sleep(duration_s)
    LOGGER.debug(f"get_longtask() {duration_s=} - done")

    return f"Long task with {duration_s=} done at: {datetime.datetime.now()}"


@router.get("/ri_surf")
async def get_ri_surf(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"ri_surf() - start")

    case_uuid = "485041ce-ad72-48a3-ac8c-484c0ed95cf8"
    ensemble_name = "iter-0"
    realization = 1
    # grid_name = "Simgrid"
    # property_name = "PORO"
    grid_name = "Geogrid"
    property_name = "Region"

    ijk_index_filter = IJKIndexFilter(min_i=0, max_i=0, min_j=0, max_j=0, min_k=0, max_k=0)

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    await grid_service.get_grid_geometry_async(ensemble_name, realization, grid_name, ijk_index_filter)
    await grid_service.get_mapped_grid_properties_async(
        ensemble_name, realization, grid_name, property_name, None, ijk_index_filter
    )

    return "OK"


@router.get("/ri_isect")
async def get_ri_isect(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"ri_isect() - start")

    case_uuid = "485041ce-ad72-48a3-ac8c-484c0ed95cf8"
    ensemble_name = "iter-0"
    realization = 1
    # grid_name = "Simgrid"
    # property_name = "PORO"
    grid_name = "Geogrid"
    property_name = "Region"

    # Polyline for testing
    # fmt:off
    xy_arr = [
        463156.911, 5929542.294,
        463564.402, 5931057.803,
        463637.925, 5931184.235,
        463690.658, 5931278.837,
        463910.452, 5931688.122,
        464465.876, 5932767.761,
        464765.876, 5934767.761,
    ]
    # fmt:on

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    await grid_service.get_polyline_intersection_async(
        ensemble_name, realization, grid_name, property_name, None, xy_arr
    )

    return "OK"


# Used for troubleshooting and testing, to what the client IP is as seen by this service
# @router.get("/whoami")
# async def whoami(request: Request) -> dict:
#     return {
#         "client_host": request.client.host if request.client else None,
#         "xff": request.headers.get("x-forwarded-for"),
#         "xreal": request.headers.get("x-real-ip"),
#         "proto": request.headers.get("x-forwarded-proto"),
#         "host": request.headers.get("host"),
#     }


from azure.servicebus import ServiceBusMessage
from primary.utils.message_bus import MessageBusSingleton, MessageBus
from primary import config

from cryptography.fernet import Fernet

from webviz_services.utils.task_meta_tracker import TaskState, get_task_meta_tracker_for_user_id
from webviz_server_schemas.pyworker.messages import CreateDerivedSmryTableMsg, WorkerOperation

from opentelemetry import trace
tracer = trace.get_tracer(__name__)





@router.get("/sb/{msg_text}")
async def get_send_sb_msg(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    msg_text: Annotated[str, Path(description="The string to send")],
    count: Annotated[int, Query(description="Number of messages to send")] = 1,
    # fmt:on
) -> str:

    perf_metrics = ResponsePerfMetrics(response)

    queue_name = "test-queue"
    LOGGER.info(f"About to send message on service bus {queue_name=} {msg_text=}")

    message_bus: MessageBus = MessageBusSingleton.get_instance()

    # for i in range(count):
    #     with tracer.start_as_current_span(f"SigSubmittingMessageToQueue_{i}", kind=trace.SpanKind.PRODUCER):
    #         msg = ServiceBusMessage(subject=WorkerOperation.DUMMY, body=msg_text)
    #         await message_bus.send_to_queue_async(queue_name=queue_name, message=msg)
    #         LOGGER.info(f"Sent message {i} on service bus {msg.message_id=}")
    #     if i == 0:
    #         perf_metrics.record_lap("send-first-msg")

    # if count > 1:
    #     perf_metrics.record_lap("send-remaining-msgs")

    # LOGGER.info(f"Sent {count} message(s) with {msg_text=} on service queue {queue_name} in {perf_metrics.to_string()}")
    # return f"Sent {count} message(s) with {msg_text=} on service queue {queue_name} in {perf_metrics.to_string()}"


    my_dummy_access_token = f"MyToken__{msg_text}"

    fernet = Fernet(config.SERVICE_BUS_PAYLOAD_FERNET_KEY)
    encrypted_access_token = fernet.encrypt(my_dummy_access_token.encode())

    user_id = authenticated_user.get_user_id()
    task_tracker = get_task_meta_tracker_for_user_id(user_id)
    task_id = task_tracker.generate_task_id("tst")
    _task_meta = await task_tracker.register_task_async(task_id=task_id, ttl_s=60, actual_start_time_utc_s=None, expected_store_key=None)

    with tracer.start_as_current_span("SubmitCreateDerivedSmryTableMsg", kind=trace.SpanKind.PRODUCER):
        msg = CreateDerivedSmryTableMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid="485041ce-ad72-48a3-ac8c-484c0ed95cf8",
            ensemble_name="iter-0",
            vector_names=["PORO", "PERMX", "PERMY", "PERMZ"],
            encrypted_access_token=encrypted_access_token,
        )
        
        sb_msg = ServiceBusMessage(subject=WorkerOperation.CREATE_DERIVED_SMRY_TABLE, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name=queue_name, message=sb_msg)
        perf_metrics.record_lap("send-first-msg")
        # LOGGER.info(f"Sent message CreateDerivedSmryTableMsg on service bus {sb_msg.message_id=}")
        # return f"Sent message CreateDerivedSmryTableMsg on service bus {sb_msg.message_id=} in {perf_metrics.to_string()}"

    while True:
        task_meta = await task_tracker.get_task_meta_async(task_id)
        LOGGER.info(f"Waiting for task {task_id} to complete, current state: {task_meta.state if task_meta else 'N/A'}")
        if task_meta is None:
            raise RuntimeError(f"Task meta for task_id {task_id} not found")
        if task_meta.state in [TaskState.SUCCEEDED, TaskState.FAILED, TaskState.CANCELLED]:
            break
        await asyncio.sleep(0.1)    

    LOGGER.info(f"Task {task_id} completed with state: {task_meta.state}")
    return f"Task {task_id} completed with state: {task_meta.state} in {perf_metrics.to_string()}"






