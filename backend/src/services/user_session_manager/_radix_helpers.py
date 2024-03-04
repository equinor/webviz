import asyncio
import logging
import os
from typing import List, Literal

import httpx
from pydantic import BaseModel, TypeAdapter

LOGGER = logging.getLogger(__name__)


# This is a bit of a hack, but it's one way to know if we're running in Radix or locally
IS_ON_RADIX_PLATFORM = True if os.getenv("RADIX_APP") is not None else False
print(f"{IS_ON_RADIX_PLATFORM=}")


# Notes on RadixResourceRequests:
#  * cpu: typical units are 'm' or no unit. '100m' means 100 milli-cpu, which is 0.1 cpu. 1000m is 1 cpu
#  * memory: typical units are 'Mi' or 'Gi'. 500Mi means 500 Mebibytes, 4Gi means 4 Gibibyte (i.e. 4 * 1024^3 bytes)
class RadixResourceRequests(BaseModel):
    cpu: str
    memory: str


# Notes on RadixJobState:
#  * The 'Waiting' status is not documented, but it seems to be the status of a job that has been created but not yet running
#  * We're not always getting a job status, in particular when querying the status of a named job, so include a None entry for status
#  * Sometimes we get an extra (undocumented) field returned, 'message'
class RadixJobState(BaseModel):
    name: str
    status: Literal["Waiting", "Running", "Succeeded", "Stopped", "Failed"] | None = None
    started: str | None = None
    ended: str | None = None
    message: str | None = None


async def create_new_radix_job(
    job_component_name: str, job_scheduler_port: int, resource_req: RadixResourceRequests
) -> str | None:
    LOGGER.debug(f"create_new_radix_job() - {job_component_name=}, {resource_req=}")

    radix_job_manager_url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"

    # Setting memory request equal to memory limit on purpose
    # Also, cpu limit is omitted on purpose.
    # Following advice here:
    #   https://home.robusta.dev/blog/kubernetes-memory-limit
    #   https://home.robusta.dev/blog/stop-using-cpu-limits
    #
    # Note that this might not be the best solution if we end up running golang apps inside the jobs since there
    # we might want to auto discover the number of available cpus and set the GOMAXPROCS environment variable accordingly.
    # As of now, it seems that it's the cpu limit value that will be picked up by for example by automaxprocs.
    request_body = {
        "resources": {
            "requests": {
                "memory": resource_req.memory,
                "cpu": resource_req.cpu,
            },
            "limits": {
                "memory": resource_req.memory,
            },
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url=radix_job_manager_url, json=request_body)
            response.raise_for_status()
        except httpx.RequestError as e:
            LOGGER.error(f"Error creating radix job, request error occurred for POST to: {e.request.url}")
            return None
        except httpx.HTTPStatusError as e:
            LOGGER.error(f"Error creating radix job, HTTP error {e.response.status_code} for POST to {e.request.url}")
            return None

    # According to the docs it seems we should be getting a json back that contains
    # a status field, which should be "Running" if the job was started successfully.
    # Apparently this is not the case, as of Feb 2024, the only useful piece of information we're
    # getting back from this call is the name of the newly created job.
    response_dict = response.json()

    LOGGER.debug("------")
    LOGGER.debug(f"{response_dict=}")
    LOGGER.debug("------")

    radix_job_name = response_dict["name"]
    LOGGER.debug(f"create_new_radix_job() - new job created {radix_job_name=}")

    return radix_job_name


async def get_radix_job_state(
    job_component_name: str, job_scheduler_port: int, radix_job_name: str
) -> RadixJobState | None:
    LOGGER.debug(f"get_radix_job_state() - {job_component_name=}, {radix_job_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{radix_job_name}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url=url)
            response.raise_for_status()
        except httpx.HTTPError as exception:
            LOGGER.debug(f"get_radix_job_state() - could not get job state {exception=}")
            return None

    # LOGGER.debug("------")
    # LOGGER.debug(f"{response.json()=}")
    # LOGGER.debug("------")

    # Note that the response we're getting back does not always contain an entry for status
    # Therefore we're allowing None for the status field of RadixJobState
    radix_job_state = RadixJobState.model_validate_json(response.content)
    LOGGER.debug(f"get_radix_job_state() - got job state {radix_job_state=}")
    return radix_job_state


async def is_radix_job_running(job_component_name: str, job_scheduler_port: int, radix_job_name: str) -> bool:
    radix_job_state = await get_radix_job_state(job_component_name, job_scheduler_port, radix_job_name)
    if radix_job_state and radix_job_state.status == "Running":
        return True

    return False


async def get_all_radix_jobs(job_component_name: str, job_scheduler_port: int) -> List[RadixJobState]:
    LOGGER.debug(f"get_all_radix_jobs() - {job_component_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.RequestError as e:
            LOGGER.error(f"Error getting radix jobs, request error occurred for GET to: {e.request.url}")
            return []
        except httpx.HTTPStatusError as e:
            LOGGER.error(f"Error getting radix jobs, HTTP error {e.response.status_code} for GET to {e.request.url}")
            return []

    # LOGGER.debug("------")
    # LOGGER.debug(f"{response.json()=}")
    # LOGGER.debug("------")

    tadapter = TypeAdapter(List[RadixJobState])
    ret_list = tadapter.validate_json(response.content)

    LOGGER.debug(f"get_all_radix_jobs() - got list with {len(ret_list)} jobs")

    return ret_list


async def delete_named_radix_job(job_component_name: str, job_scheduler_port: int, radix_job_name: str) -> bool:
    async with httpx.AsyncClient() as client:
        return await _delete_named_radix_job_with_client(client, job_component_name, job_scheduler_port, radix_job_name)


async def _delete_named_radix_job_with_client(
    client: httpx.AsyncClient, job_component_name: str, job_scheduler_port: int, radix_job_name: str
) -> bool:
    LOGGER.debug(f"_delete_named_radix_job_with_client() - {job_component_name=}, {radix_job_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{radix_job_name}"
    try:
        response = await client.delete(url)
        response.raise_for_status()
    except httpx.RequestError as e:
        LOGGER.error(f"Error deleting radix job, request error occurred for DELETE to: {e.request.url}.")
        return False
    except httpx.HTTPStatusError as e:
        LOGGER.error(f"Error deleting radix job, HTTP error {e.response.status_code} for DELETE to {e.request.url}")
        return False

    LOGGER.debug(f"_delete_named_radix_job_with_client() - deleted radix job {radix_job_name=}")
    return True


async def delete_all_radix_jobs(job_component_name: str, job_scheduler_port: int) -> None:
    LOGGER.debug(f"delete_all_radix_jobs() - {job_component_name=}")

    job_list = await get_all_radix_jobs(job_component_name, job_scheduler_port)
    if not job_list:
        LOGGER.debug(f"delete_all_radix_jobs() - no jobs to delete")
        return

    delete_coros_arr = []

    async with httpx.AsyncClient() as client:
        for job in job_list:
            radix_job_name = job.name
            LOGGER.debug(f"delete_all_radix_jobs() - deleting job {radix_job_name}")
            del_coro = _delete_named_radix_job_with_client(
                client=client,
                job_component_name=job_component_name,
                job_scheduler_port=job_scheduler_port,
                radix_job_name=radix_job_name,
            )
            delete_coros_arr.append(del_coro)

        result_arr = await asyncio.gather(*delete_coros_arr)

    # LOGGER.debug("------")
    # LOGGER.debug(f"{result_arr=}")
    # LOGGER.debug("------")

    LOGGER.debug(f"delete_all_radix_jobs() - finished")
