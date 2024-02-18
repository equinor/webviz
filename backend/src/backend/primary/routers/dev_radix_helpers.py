import logging
from enum import Enum
from typing import Literal, List
import os

import httpx
import redis

from src import config
from pydantic import BaseModel

LOGGER = logging.getLogger(__name__)

IS_RUNNING_IN_RADIX = True if os.getenv("RADIX_APP") is not None else False
print(f"{IS_RUNNING_IN_RADIX=}")



class RadixJobState(BaseModel):
    name: str
    started: str
    ended: str
    status: Literal["Running", "Successful", "Failed"]


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


async def create_new_radix_job(job_component_name: str, job_scheduler_port: int) -> RadixJobState | None:
    LOGGER.debug(f"##### create_new_radix_job()  {job_component_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"
    request_body = {
        "resources": {
            "limits": {"memory": "500M", "cpu": "100m"},
            "requests": {"memory": "500M", "cpu": "100m"},
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url=url, json=request_body)
        response.raise_for_status()

    LOGGER.debug("------")
    
    response_dict = response.json()
    LOGGER.debug(response_dict)

    radix_job_state = RadixJobState.model_validate_json(response.content)
    LOGGER.debug(radix_job_state)

    LOGGER.debug("------")

    return radix_job_state


async def get_all_radix_jobs(job_component_name: str, job_scheduler_port: int) -> List[dict]:
    LOGGER.debug(f"##### get_all_radix_jobs()  {job_component_name=}")

    url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()

    job_list = response.json()
    return job_list


async def delete_all_radix_job_instances(job_component_name: str, job_scheduler_port: int) -> None:
    LOGGER.debug(f"##### delete_all_radix_job_instances()  {job_component_name=}")

    job_list = await get_all_radix_jobs(job_component_name, job_scheduler_port)
    async with httpx.AsyncClient() as client:
        for job in job_list:
            job_name = job["name"]
            LOGGER.debug(f"------Deleting job {job_name}")
            url = f"http://{job_component_name}:{job_scheduler_port}/api/v1/jobs/{job_name}"
            response = await client.delete(url)
            response.raise_for_status()
            LOGGER.debug(f"------Deleted job {job_name} --- {response.text}")
