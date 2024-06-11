import logging

from typing import List

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case
from fmu.sumo.explorer.objects.cube_collection import CubeCollection

from ._helpers import create_sumo_client, create_sumo_case_async
from .seismic_types import SeismicCubeMeta, VdsHandle

LOGGER = logging.getLogger(__name__)


class SeismicAccess:
    def __init__(self, case: Case, case_uuid: str, iteration_name: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SeismicAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return SeismicAccess(case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_seismic_cube_meta_list_async(self) -> List[SeismicCubeMeta]:
        seismic_cube_collection: CubeCollection = self._case.cubes.filter(iteration=self._iteration_name, realization=0)
        seismic_cube_meta_list: List[SeismicCubeMeta] = []
        async for cube in seismic_cube_collection:
            t_start = cube["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = cube["data"].get("time", {}).get("t1", {}).get("value", None)

            if not t_start and not t_end:
                raise ValueError(f"Cube {cube['data']['tagname']} has no time information")

            if t_start and not t_end:
                iso_string_or_time_interval = t_start

            else:
                iso_string_or_time_interval = f"{t_start}/{t_end}"

            seismic_meta = SeismicCubeMeta(
                seismic_attribute=cube["data"].get("tagname"),
                iso_date_or_interval=iso_string_or_time_interval,
                is_observation=cube["data"]["is_observation"],
                is_depth=cube["data"]["vertical_domain"] == "depth",
            )
            seismic_cube_meta_list.append(seismic_meta)
        return seismic_cube_meta_list

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
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")
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

        cube_collection: CubeCollection = self._case.cubes.filter(
            tagname=seismic_attribute,
            realization=realization,
            iteration=self._iteration_name,
            time=time_filter,
            # is_observation=observed,  # Does not work for observed. Only handles observed on case level?
        )

        # Filter on observed
        cubes = []
        async for cube in cube_collection:
            if cube["data"]["is_observation"] == observed:
                cubes.append(cube)
                break

        if not cubes:
            raise ValueError(f"Cube {seismic_attribute} not found in case {self._case_uuid}")
        if len(cubes) > 1:
            raise ValueError(f"Multiple cubes found for {seismic_attribute} in case {self._case_uuid}")
        cube = cubes[0]

        return VdsHandle(
            sas_token=cube.sas,
            vds_url=clean_vds_url(cube.url),
        )


def clean_vds_url(vds_url: str) -> str:
    """clean vds url"""
    return vds_url.replace(":443", "")
