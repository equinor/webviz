import logging
from typing import List
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects.cube import Cube

from primary.services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError, Service

from .seismic_types import SeismicCubeMeta, SeismicCubeSpec, VdsHandle
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class SeismicAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "SeismicAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_seismic_cube_meta_list_async(self) -> List[SeismicCubeMeta]:
        realizations = await self._ensemble_context.realizationids_async

        seismic_context = self._ensemble_context.cubes.filter(
            realization=realizations[0],
        )

        cube_meta_arr: list[SeismicCubeMeta] = []
        sumo_cube_object: Cube
        async for sumo_cube_object in seismic_context:
            cube_meta_arr.append(_create_seismic_cube_meta_from_sumo_cube_object(sumo_cube_object))

        return cube_meta_arr

    async def get_vds_handle_async(
        self,
        seismic_attribute: str,
        realization: int,
        time_or_interval_str: str,
        observed: bool = False,
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

        cube_context: SearchContext = self._ensemble_context.cubes.filter(
            tagname=seismic_attribute,
            realization=realization,
            time=time_filter,
            # is_observation=observed,  # Does not work for observed. Only handles observed on case level?
        )

        # Filter on observed
        cubes: List[Cube] = []
        async for cube in cube_context:
            if cube["data"]["is_observation"] == observed:
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


def _create_seismic_cube_meta_from_sumo_cube_object(sumo_cube_object: Cube) -> SeismicCubeMeta:
    t_start = sumo_cube_object["data"].get("time", {}).get("t0", {}).get("value", None)
    t_end = sumo_cube_object["data"].get("time", {}).get("t1", {}).get("value", None)

    if not t_start and not t_end:
        raise ValueError(f"Cube {sumo_cube_object['data']['tagname']} has no time information")

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
    seismic_meta = SeismicCubeMeta(
        seismic_attribute=sumo_cube_object["data"].get("tagname"),
        unit=sumo_cube_object["data"].get("unit"),
        iso_date_or_interval=iso_string_or_time_interval,
        is_observation=sumo_cube_object["data"]["is_observation"],
        is_depth=sumo_cube_object["data"].get("vertical_domain", "depth") == "depth",
        bbox=sumo_cube_object["data"]["bbox"],
        spec=seismic_spec,
    )
    return seismic_meta
