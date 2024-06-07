import logging
from typing import List, Dict

import json
from fmu.sumo.explorer.objects import Case
from fmu.sumo.explorer.objects.dictionary import Dictionary

from ._helpers import create_sumo_client, create_sumo_case_async
from .observation_types import (
    Observations,
    SummaryVectorDateObservation,
    SummaryVectorObservations,
    ObservationType,
    RftObservations,
)

LOGGER = logging.getLogger(__name__)


class ObservationAccess:
    def __init__(self, case: Case, case_uuid: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str) -> "ObservationAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return cls(case=case, case_uuid=case_uuid)

    async def get_observations(self) -> Observations:
        """Retrieve all observations found in sumo case"""
        observations_collection = self._case.dictionaries.filter(
            stage="case",
            name="observations",
            tagname="all",
        )
        if await observations_collection.length_async() == 0:
            return Observations()
        if await observations_collection.length_async() > 1:
            raise ValueError(f"More than one observations dictionary found. {observations_collection.names}")

        observations_handle: Dictionary = await observations_collection.getitem_async(0)
        observations_byteio = await observations_handle.blob_async
        observations_dict = json.loads(observations_byteio.getvalue().decode())

        return Observations(
            summary=_create_summary_observations(observations_dict), rft=_create_rft_observations(observations_dict)
        )


def _create_summary_observations(observations_dict: dict) -> List[SummaryVectorObservations]:
    """Create summary observations from the observations dictionary"""
    summary_observations: List[SummaryVectorObservations] = []
    if ObservationType.SUMMARY not in observations_dict:
        return summary_observations

    summary_observations_dict: Dict[str, Dict[str, list]] = observations_dict[ObservationType.SUMMARY]

    for vector_name, observations_data in summary_observations_dict.items():
        observation_names = observations_data["observation_name"]
        observation_values = observations_data["value"]
        observation_errors = observations_data["error"]
        observation_dates = observations_data["date"]

        num_observations = len(observation_names)
        if (
            len(observation_values) != num_observations
            or len(observation_errors) != num_observations
            or len(observation_dates) != num_observations
        ):
            raise ValueError(f"Inconsistent observations data for vector {vector_name}")

        summary_observations.append(
            SummaryVectorObservations(
                vector_name=vector_name,
                observations=[
                    SummaryVectorDateObservation(
                        date=observation_dates[i],
                        value=observation_values[i],
                        error=observation_errors[i],
                        label=observation_names[i],
                    )
                    for i in range(num_observations)
                ],
            )
        )
    return summary_observations


def _create_rft_observations(observations_dict: dict) -> List[RftObservations]:
    """Create RFT observations from the observations dictionary"""
    rft_observations: List[RftObservations] = []
    if ObservationType.RFT not in observations_dict:
        return rft_observations
    LOGGER.debug("RFT observations found. This is not yet implemented.")
    return rft_observations
