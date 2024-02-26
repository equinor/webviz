import asyncio
import logging
import os
from enum import Enum
from typing import List, Literal

import httpx
import redis
from pydantic import BaseModel, TypeAdapter

from src import config

LOGGER = logging.getLogger(__name__)

# This is a bit of a hack, but it's one way to know if we're running in Radix or locally
IS_ON_RADIX_PLATFORM = True if os.getenv("RADIX_APP") is not None else False
print(f"{IS_ON_RADIX_PLATFORM=}")


# Notes on the RadixJobState:
#  * The 'Waiting' status is not documented, but it seems to be the status of a job that has been created but not yet running
#  * We're not always getting a job status, in particular when querying the status of a named job, so include a None entry for status
#  * Sometimes we get an extra (undocumented) field returned, 'message'
class RadixJobState(BaseModel):
    name: str
    status: Literal["Waiting", "Running", "Successful", "Failed"] | None = None
    started: str | None = None
    ended: str | None = None
    message: str | None = None


async def verify_that_named_radix_job_is_running(job_component_name: str, job_scheduler_port: int, radix_job_name: str) -> bool:
    radix_job_manager_url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{radix_job_name}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(radix_job_manager_url)
            response.raise_for_status()
            response_dict = response.json()
            status_str = response_dict["status"]
            print(f"------{radix_job_name} is {status_str}")
            if (response_dict["status"] == "Running"):
                return True
        except httpx.RequestError as exc:
            print(f"verifyjobrunning An error occurred while requesting {exc.request.url!r}.")
            return False
        except httpx.HTTPStatusError as exc:
            print(f"verifyjobrunning Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
            return False

    return False


async def create_new_radix_job(job_component_name: str, job_scheduler_port: int) -> str | None:
    LOGGER.debug(f"##### create_new_radix_job()  {job_component_name=}")

    radix_job_manager_url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"
    request_body = {
        "resources": {
            "limits": {"memory": "500M", "cpu": "100m"},
            "requests": {"memory": "500M", "cpu": "100m"},
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url=radix_job_manager_url, json=request_body)
            response.raise_for_status()
        except httpx.RequestError as exc:
            LOGGER.error(f"Request error occurred for POST to: {exc.request.url!r}")
            return None
        except httpx.HTTPStatusError as exc:
            LOGGER.error(f"Request returned HTTP error {exc.response.status_code} for POST to {exc.request.url!r}")
            return None

    # According to the docs it seems we should be getting a json back that contains a
    #  status field, which should be "Running" if the job was started successfully.
    # Apparently this is not the case, as of Feb 2024, the only useful piece of information we're getting
    # back from this call is the name of the newly created job.
    response_dict = response.json()

    LOGGER.debug("------")
    LOGGER.debug(f"{response_dict=}")
    LOGGER.debug("------")

    radix_job_name = response_dict["name"]
    return radix_job_name


async def get_radix_job_state(job_component_name: str, job_scheduler_port: int, radix_job_name: str) -> RadixJobState | None:
    LOGGER.debug(f"##### get_radix_job_state()  {job_component_name=}, {radix_job_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{radix_job_name}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url=url)
        response.raise_for_status()

    LOGGER.debug("------")
    response_dict = response.json()
    LOGGER.debug(f"{response_dict=}")
    LOGGER.debug("------")

    # Note that the response we're getting back does not always contain an entry for status
    radix_job_state = RadixJobState.model_validate_json(response.content)
    return radix_job_state


async def get_all_radix_jobs(job_component_name: str, job_scheduler_port: int) -> List[RadixJobState]:
    LOGGER.debug(f"##### get_all_radix_jobs()  {job_component_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()

    LOGGER.debug("------")
    response_list = response.json()
    LOGGER.debug(f"{response_list=}")

    ta = TypeAdapter(List[RadixJobState])
    ret_list = ta.validate_json(response.content)

    return ret_list


async def delete_radix_job_instance(client: httpx.AsyncClient, job_component_name: str, job_scheduler_port: int, radix_job_name: str) -> bool:
    LOGGER.debug(f"##### delete_radix_job_instance()  {job_component_name=}, {radix_job_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{radix_job_name}"
    try:
        response = await client.delete(url)
        response.raise_for_status()
        return True
    except httpx.RequestError as exc:
        LOGGER.error(f"An error occurred while requesting DELETE {exc.request.url!r}.")
        return False
    except httpx.HTTPStatusError as exc:
        LOGGER.error(f"Error HTTP status {exc.response.status_code} while requesting DELETE {exc.request.url!r}.")
        return False


async def delete_all_radix_job_instances(job_component_name: str, job_scheduler_port: int) -> None:
    LOGGER.debug(f"##### delete_all_radix_job_instances()  {job_component_name=}")

    job_list = await get_all_radix_jobs(job_component_name, job_scheduler_port)
    delete_coros_arr = []

    async with httpx.AsyncClient() as client:
        for job in job_list:
            job_name = job.name
            LOGGER.debug(f"------Deleting job {job_name}")
            del_coro = delete_radix_job_instance(client=client, job_component_name=job_component_name, job_scheduler_port=job_scheduler_port, radix_job_name=job_name)
            delete_coros_arr.append(del_coro)

        result_arr = await asyncio.gather(*delete_coros_arr)

    LOGGER.debug("------")
    LOGGER.debug(f"{result_arr=}")
    LOGGER.debug("------")

