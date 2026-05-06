import pyarrow as pa

from fmu.datamodels.standard_results.ert_observations_summary import ErtObservationsSummaryResult
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table
from pydantic import ValidationError

from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError, Service

from .sumo_client_factory import create_sumo_client
from .observation_types import (
    SummaryVectorDateObservation,
    SummaryVectorObservations,
)


class ObservationAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "ObservationAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_summary_observations_async(self) -> list[SummaryVectorObservations]:
        """Retrieve summary observations found in sumo case"""
        context = self._ensemble_context.filter(standard_result=StandardResultName.observations_summary)
        docs_len = await context.length_async()
        if docs_len == 0:
            return []
        if docs_len > 1:
            raise MultipleDataMatchesError(
                f"More than one summary observations found for case {self._case_uuid} and ensemble {self._ensemble_name}",
                Service.SUMO,
            )
        obs_handle: Table = await context.getitem_async(0)
        obs_table = await obs_handle.to_arrow_async()
        return _create_summary_observations_from_table(obs_table)


def _create_summary_observations_from_table(obs_table: pa.Table) -> list[SummaryVectorObservations]:
    try:
        ert_observations = ErtObservationsSummaryResult.model_validate(obs_table.to_pylist())
    except ValidationError as exc:
        raise InvalidDataError("Invalid summary observations table", Service.SUMO) from exc

    observations_by_vector: dict[str, list[SummaryVectorDateObservation]] = {}
    for row in ert_observations.root:
        response_key = row.response_key
        if response_key not in observations_by_vector:
            observations_by_vector[response_key] = []

        observations_by_vector[response_key].append(
            SummaryVectorDateObservation(
                date=row.time.isoformat(),
                value=row.observation_value,
                error=row.observation_error,
                label=response_key,
            )
        )

    return [
        SummaryVectorObservations(vector_name=vector_name, observations=observations)
        for vector_name, observations in observations_by_vector.items()
    ]
