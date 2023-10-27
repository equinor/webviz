import logging
from typing import List

import json
from fmu.sumo.explorer.objects.dictionary import Dictionary

from ._helpers import SumoEnsemble
from .observation_types import (
    Observations,
    SummaryVectorDateObservation,
    SummaryVectorObservations,
    ObservationType,
    RftObservations,
)

LOGGER = logging.getLogger(__name__)


class ObservationAccess(SumoEnsemble):
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
    for smry_obs in observations_dict[ObservationType.SUMMARY]:
        summary_observations.append(
            SummaryVectorObservations(
                vector_name=smry_obs["key"],
                observations=[
                    SummaryVectorDateObservation(
                        date=obs["date"],
                        value=obs["value"],
                        error=obs["error"],
                        label=obs["label"],
                    )
                    for obs in smry_obs["observations"]
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
