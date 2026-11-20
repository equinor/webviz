import asyncio
import logging

from fmu.sumo.explorer.explorer import SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.sumo_access.ensemble_lineage import (
    MAX_RESTART_CHAIN_DEPTH,
    ResolvedEnsemble,
    RestartChain,
    get_restart_chain_async,
)
from webviz_services.sumo_access.parameter_access import ParameterAccess, create_ensemble_sensitivities
from webviz_services.sumo_access.parameter_types import EnsembleParameter, ParametersAndSensitivities
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client

from ._restart_parameter_merger import merge_restart_parameters

LOGGER = logging.getLogger(__name__)


class EnsembleParametersAssembler:
    """Assembles the parameters of an ensemble, combined with the parameters of the ensembles it was restarted from.

    Takes a SumoClient rather than a ParameterAccess since one ParameterAccess is needed per restart ancestor.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str) -> None:
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._ensemble_name = ensemble_name
        self._own_access = ParameterAccess(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "EnsembleParametersAssembler":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_parameters_and_sensitivities_async(self) -> ParametersAndSensitivities:
        """Retrieve parameters and sensitivities for the ensemble.

        If the ensemble has standard-result parameters and was restarted from other ensembles, the
        standard-result parameters of those restart ensembles are combined with the ensemble's own.

        Returns:
            A ParametersAndSensitivities object containing:
            - List of ensemble parameters with metadata and values, own parameters first
            - List of ensemble sensitivities derived from the ensemble's own parameters
            - Non-fatal user-facing warnings, e.g. if a restart ensemble could not be found or if
              realization-level parameters are missing from the standard result

        Raises:
            MultipleDataMatchesError: If multiple parameter tables are found
            NoDataError: If no parameters are found
            ServiceRequestError: If parameter aggregation fails
            InvalidDataError: If data format is unexpected, or parameters from restart ensembles conflict
        """
        try:
            async with asyncio.TaskGroup() as tg:
                own_standard_parameters_task = tg.create_task(self._own_access.get_standard_result_parameters_async())
                restart_chain_task = tg.create_task(
                    get_restart_chain_async(self._sumo_client, self._case_uuid, self._ensemble_name)
                )
        except* ServiceLayerException as exc_group:
            for exc in exc_group.exceptions:
                raise exc from exc_group  # Reraise the first exception

        own_standard_parameters = own_standard_parameters_task.result()
        restart_chain = restart_chain_task.result()

        warnings: list[str] = []
        if own_standard_parameters is None:
            LOGGER.debug(
                f"No Standard result parameter table found for case {self._case_uuid} and ensemble "
                f"{self._ensemble_name}. Attempting legacy parameter retrieval."
            )
            own_parameters = await self._own_access.get_legacy_parameters_async()
            parameters = own_parameters
            warnings.extend(_legacy_restart_warnings(restart_chain))
        else:
            own_parameters = own_standard_parameters
            try:
                async with asyncio.TaskGroup() as tg:
                    merge_task = tg.create_task(self._merge_with_restart_ancestors_async(own_parameters, restart_chain))
                    missing_warning_task = tg.create_task(
                        self._own_access.detect_parameters_missing_from_standard_result_async(own_parameters)
                    )
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group  # Reraise the first exception

            parameters, restart_warnings = merge_task.result()
            warnings.extend(restart_warnings)
            missing_warning = missing_warning_task.result()
            if missing_warning is not None:
                warnings.append(missing_warning)

        # Sensitivities describe the ensemble's own realizations; any combined ancestors are verified to match there
        sensitivities = create_ensemble_sensitivities(own_parameters)

        return ParametersAndSensitivities(
            parameters=parameters,
            sensitivities=sensitivities,
            warnings=warnings,
            # Legacy ensembles never combine ancestor parameters, so resolving the ancestor later changes nothing
            has_unresolved_restart_ensemble=(
                own_standard_parameters is not None and restart_chain.unresolved_ensemble_uuid is not None
            ),
        )

    async def _merge_with_restart_ancestors_async(
        self, own_parameters: list[EnsembleParameter], restart_chain: RestartChain
    ) -> tuple[list[EnsembleParameter], list[str]]:
        """Merge standard-result parameters from the restart ancestors into the ensemble's own parameters"""
        warnings = _standard_result_chain_warnings(restart_chain)
        if not restart_chain.ancestors:
            return own_parameters, warnings

        perf_metrics = PerfMetrics()
        try:
            async with asyncio.TaskGroup() as tg:
                ancestor_tasks = [
                    (ancestor, tg.create_task(self._get_ancestor_standard_result_parameters_async(ancestor)))
                    for ancestor in restart_chain.ancestors
                ]
        except* ServiceLayerException as exc_group:
            for exc in exc_group.exceptions:
                raise exc from exc_group  # Reraise the first exception
        perf_metrics.record_lap("load-ancestors")

        ancestors_and_parameters: list[tuple[ResolvedEnsemble, list[EnsembleParameter]]] = []
        for ancestor, task in ancestor_tasks:
            ancestor_parameters = task.result()
            if not ancestor_parameters:
                warnings.append(
                    f"Restart ensemble {ancestor.label} has no standard-result parameters; its "
                    "parameters were not combined."
                )
            else:
                ancestors_and_parameters.append((ancestor, ancestor_parameters))

        # The chain has ancestors only if the ensemble itself was found, so the fallback is never expected to be used
        own_ensemble_label = restart_chain.ensemble.label if restart_chain.ensemble is not None else self._ensemble_name
        merged_parameters, merge_warnings = merge_restart_parameters(
            own_parameters, ancestors_and_parameters, own_ensemble_label
        )
        warnings.extend(merge_warnings)
        perf_metrics.record_lap("merge")

        LOGGER.debug(
            f"EnsembleParametersAssembler._merge_with_restart_ancestors_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}, {len(restart_chain.ancestors)=}"
        )

        return merged_parameters, warnings

    async def _get_ancestor_standard_result_parameters_async(
        self, ancestor: ResolvedEnsemble
    ) -> list[EnsembleParameter] | None:
        access = ParameterAccess(
            sumo_client=self._sumo_client, case_uuid=ancestor.case_uuid, ensemble_name=ancestor.ensemble_name
        )
        return await access.get_standard_result_parameters_async(ensemble_label=ancestor.label)


def _standard_result_chain_warnings(restart_chain: RestartChain) -> list[str]:
    warnings: list[str] = []

    if restart_chain.unresolved_ensemble_uuid is not None:
        if restart_chain.ancestors:
            warnings.append(
                f"Restart ensemble {restart_chain.ancestors[-1].label} was restarted from ensemble "
                f"{restart_chain.unresolved_ensemble_uuid}, which could not be found in Sumo (deleted or no "
                "access). Parameters from that ensemble and any earlier ones were not loaded."
            )
        else:
            warnings.append(
                f"This ensemble was restarted from ensemble {restart_chain.unresolved_ensemble_uuid}, which "
                "could not be found in Sumo (deleted or no access). Only parameters from the ensemble itself "
                "are loaded."
            )

    if restart_chain.truncated:
        warnings.append(
            f"The chain of restart ensembles is longer than {MAX_RESTART_CHAIN_DEPTH} ensembles or contains a "
            f"cycle. Restart ensembles beyond the first {len(restart_chain.ancestors)} in the chain were not "
            "considered."
        )

    return warnings


def _legacy_restart_warnings(restart_chain: RestartChain) -> list[str]:
    """Warnings for an ensemble whose own parameters are not a standard result, so nothing is combined"""
    if restart_chain.ancestors:
        return [
            f"This ensemble was restarted from {restart_chain.ancestors[0].label}, but its parameters are not "
            "stored as a standard result, so parameters from restart ensembles were not combined."
        ]
    if restart_chain.unresolved_ensemble_uuid is not None:
        return [
            f"This ensemble was restarted from ensemble {restart_chain.unresolved_ensemble_uuid}, which could not "
            "be found in Sumo (deleted or no access). Only parameters from the ensemble itself are loaded."
        ]
    if restart_chain.truncated:
        return [
            "This ensemble's restart metadata refers to the ensemble itself. Only parameters from the ensemble "
            "itself are loaded."
        ]
    return []
