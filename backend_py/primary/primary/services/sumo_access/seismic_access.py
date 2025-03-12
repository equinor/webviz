import logging
from typing import List
import asyncio
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from primary.services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError, Service

from .seismic_types import SeismicCubeMeta, SeismicCubeSpec, VdsHandle
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class SeismicAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SeismicAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_seismic_cube_meta_list_async(self) -> List[SeismicCubeMeta]:
        realizations = await self._ensemble_context.realizationids_async

        seismic_context = self._ensemble_context.cubes.filter(
            realization=realizations[0],
        )

        length_cubes = await seismic_context.length_async()
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(_get_seismic_cube_meta_async(seismic_context, i)) for i in range(length_cubes)]
        cube_meta_arr: list[SeismicCubeMeta] = [task.result() for task in tasks]

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
        cubes = []
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

        sas_token, url = await asyncio.gather(cube.sas_async, cube.url_async)
        return VdsHandle(
            sas_token=sas_token,
            vds_url=clean_vds_url(url),
        )


def clean_vds_url(vds_url: str) -> str:
    """clean vds url"""
    return vds_url.replace(":443", "")


async def _get_seismic_cube_meta_async(search_context: SearchContext, item_no: int) -> SeismicCubeMeta:
    seismic_cube = await search_context.getitem_async(item_no)
    t_start = seismic_cube["data"].get("time", {}).get("t0", {}).get("value", None)
    t_end = seismic_cube["data"].get("time", {}).get("t1", {}).get("value", None)

    if not t_start and not t_end:
        raise ValueError(f"Cube {seismic_cube['data']['tagname']} has no time information")

    if t_start and not t_end:
        iso_string_or_time_interval = t_start

    else:
        iso_string_or_time_interval = f"{t_start}/{t_end}"

    seismic_spec = SeismicCubeSpec(
        num_cols=seismic_cube["data"]["spec"]["ncol"],
        num_rows=seismic_cube["data"]["spec"]["nrow"],
        num_layers=seismic_cube["data"]["spec"]["nlay"],
        x_origin=seismic_cube["data"]["spec"]["xori"],
        y_origin=seismic_cube["data"]["spec"]["yori"],
        z_origin=seismic_cube["data"]["spec"]["zori"],
        x_inc=seismic_cube["data"]["spec"]["xinc"],
        y_inc=seismic_cube["data"]["spec"]["yinc"],
        z_inc=seismic_cube["data"]["spec"]["zinc"],
        y_flip=seismic_cube["data"]["spec"]["yflip"],
        z_flip=seismic_cube["data"]["spec"]["zflip"],
        rotation=seismic_cube["data"]["spec"]["rotation"],
    )
    seismic_meta = SeismicCubeMeta(
        seismic_attribute=seismic_cube["data"].get("tagname"),
        unit=seismic_cube["data"].get("unit"),
        iso_date_or_interval=iso_string_or_time_interval,
        is_observation=seismic_cube["data"]["is_observation"],
        is_depth=seismic_cube["data"].get("vertical_domain", "depth") == "depth",
        bbox=seismic_cube["data"]["bbox"],
        spec=seismic_spec,
    )
    return seismic_meta
