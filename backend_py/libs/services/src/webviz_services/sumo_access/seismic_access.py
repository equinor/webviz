import logging
from typing import List
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects.cube import Cube

from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError, Service

from .seismic_types import SeismicCubeMeta, SeismicCubeSpec, VdsHandle, SeismicRepresentation
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class SeismicAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._case_context = SearchContext(sumo=self._sumo_client).filter(uuid=self._case_uuid)

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "SeismicAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_seismic_cube_meta_list_async(self) -> List[SeismicCubeMeta]:
        cube_meta_arr: list[SeismicCubeMeta] = []
        sumo_cube_object: Cube
        ensemble_context = self._case_context.filter(ensemble=self._ensemble_name)
        realizations = await ensemble_context.realizationids_async

        if realizations is not None and len(realizations) > 1:

            seismic_real_context = ensemble_context.cubes.filter(
                realization=realizations[0],
            )

            async for sumo_cube_object in seismic_real_context:
                cube_meta_arr.append(
                    _create_seismic_cube_meta_from_sumo_cube_object(sumo_cube_object, realization_stage=True)
                )
        seismc_case_context = self._case_context.cubes.filter(stage="case")
        async for sumo_cube_object in seismc_case_context:
            cube_meta_arr.append(
                _create_seismic_cube_meta_from_sumo_cube_object(sumo_cube_object, realization_stage=False)
            )
        return cube_meta_arr

    async def get_vds_handle_async(
        self,
        seismic_attribute: str,
        representation: SeismicRepresentation,
        realization: int | None,
        time_or_interval_str: str,
    ) -> VdsHandle:
        """Get the vds handle for a given cube"""
        timestamp_arr = time_or_interval_str.split("/", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise InvalidDataError("time_or_interval_str must contain a single timestamp or interval", Service.SUMO)
        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )
        cube_context: SearchContext
        if representation == SeismicRepresentation.OBSERVED_IN_CASE:

            cube_context = self._case_context.cubes.filter(
                tagname=seismic_attribute,
                stage="case",
                time=time_filter,
            )
        else:
            # Realization context
            if realization is None:
                raise InvalidDataError("realization must be provided for non-observed cubes", Service.SUMO)
            cube_context = self._case_context.cubes.filter(
                ensemble=self._ensemble_name,
                tagname=seismic_attribute,
                realization=realization,
                time=time_filter,
            )
        # Filter on observed
        cubes: List[Cube] = []
        async for cube in cube_context:
            if cube["data"]["is_observation"] == (
                representation == SeismicRepresentation.OBSERVED_IN_CASE
                or representation == SeismicRepresentation.OBSERVED_IN_REALIZATION
            ):
                cubes.append(cube)
                break

        if not cubes:
            raise NoDataError(f"Cube {seismic_attribute} not found in case {self._case_uuid}", Service.SUMO)
        if len(cubes) > 1:
            raise MultipleDataMatchesError(
                f"Multiple cubes found for {seismic_attribute} in case {self._case_uuid}", Service.SUMO
            )

        cube = cubes[0]

        url, sas_token = await cube.auth_async

        return VdsHandle(
            sas_token=sas_token,
            vds_url=clean_vds_url(url),
        )


def clean_vds_url(vds_url: str) -> str:
    """clean vds url"""
    return vds_url.replace(":443", "")


def _create_seismic_cube_meta_from_sumo_cube_object(sumo_cube_object: Cube, realization_stage: bool) -> SeismicCubeMeta:
    t_start = sumo_cube_object["data"].get("time", {}).get("t0", {}).get("value", None)
    t_end = sumo_cube_object["data"].get("time", {}).get("t1", {}).get("value", None)

    if not t_start and not t_end:
        raise InvalidDataError(f"Cube {sumo_cube_object['data']['tagname']} has no time information", Service.SUMO)

    if t_start and not t_end:
        iso_string_or_time_interval = t_start

    else:
        iso_string_or_time_interval = f"{t_start}/{t_end}"

    seismic_spec = SeismicCubeSpec(
        num_cols=sumo_cube_object["data"]["spec"]["ncol"],
        num_rows=sumo_cube_object["data"]["spec"]["nrow"],
        num_layers=sumo_cube_object["data"]["spec"]["nlay"],
        x_origin=sumo_cube_object["data"]["spec"]["xori"],
        y_origin=sumo_cube_object["data"]["spec"]["yori"],
        z_origin=sumo_cube_object["data"]["spec"]["zori"],
        x_inc=sumo_cube_object["data"]["spec"]["xinc"],
        y_inc=sumo_cube_object["data"]["spec"]["yinc"],
        z_inc=sumo_cube_object["data"]["spec"]["zinc"],
        y_flip=sumo_cube_object["data"]["spec"]["yflip"],
        z_flip=sumo_cube_object["data"]["spec"]["zflip"],
        rotation=sumo_cube_object["data"]["spec"]["rotation"],
    )
    is_observed = sumo_cube_object["data"]["is_observation"]
    if realization_stage:
        if is_observed:
            representation = SeismicRepresentation.OBSERVED_IN_REALIZATION
        else:
            representation = SeismicRepresentation.MODELLED
    else:
        if is_observed:
            representation = SeismicRepresentation.OBSERVED_IN_CASE
        else:
            raise InvalidDataError("In case stage, only observed cubes are allowed", Service.SUMO)
    seismic_meta = SeismicCubeMeta(
        seismic_attribute=sumo_cube_object["data"].get("tagname"),
        unit=sumo_cube_object["data"].get("unit"),
        iso_date_or_interval=iso_string_or_time_interval,
        representation=representation,
        is_depth=sumo_cube_object["data"].get("vertical_domain", "depth") == "depth",
        bbox=sumo_cube_object["data"]["bbox"],
        spec=seismic_spec,
    )
    return seismic_meta
