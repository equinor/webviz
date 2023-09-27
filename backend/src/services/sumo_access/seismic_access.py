import logging

from typing import List, Optional, Tuple

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection
from fmu.sumo.explorer.objects.cube_collection import CubeCollection
from sumo.wrapper import SumoClient

# from ..oneseismic_access.vds_types import VdsHandle

from ._helpers import create_sumo_client_instance
from .seismic_types import SeismicMeta, VdsHandle

LOGGER = logging.getLogger(__name__)


class SeismicAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self._sumo_case_obj: Optional[Case] = None

    def _get_sumo_case(self) -> Case:
        """
        Get the Sumo case that we should be working on.
        Raises exception if case isn't found
        """
        if self._sumo_case_obj is None:
            case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
            if len(case_collection) != 1:
                raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

            self._sumo_case_obj = case_collection[0]

        return self._sumo_case_obj

    def get_seismic_directory(self) -> List[SeismicMeta]:
        case = self._get_sumo_case()

        seismic_collection: CubeCollection = case.cubes.filter(iteration=self._iteration_name, realization=0)
        seismic_metas: List[SeismicMeta] = []
        for surf in seismic_collection:
            iso_string_or_time_interval = None
            t_start = surf["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = surf["data"].get("time", {}).get("t1", {}).get("value", None)
            if not t_start and not t_end:
                raise ValueError(f"Cube {surf['data']['tagname']} has no time information")
            if t_start and not t_end:
                iso_string_or_time_interval = t_start
            if t_start and t_end:
                iso_string_or_time_interval = f"{t_start}/{t_end}"

            seismic_meta = SeismicMeta(
                seismic_attribute=surf["data"].get("tagname"),
                iso_date_or_interval=iso_string_or_time_interval,
                is_observation=surf["data"]["is_observation"],
                zmin=surf["data"]["bbox"]["zmin"],
                zmax=surf["data"]["bbox"]["zmax"],
            )
            seismic_metas.append(seismic_meta)
        return seismic_metas

    def get_vds_handle(
        self,
        seismic_attribute: str,
        realization: int,
        time_or_interval_str: str,
        observed: bool = False,
    ) -> VdsHandle:
        """Get the vds handle for a given cube"""
        case = self._get_sumo_case()
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

        cube_collection: CubeCollection = case.cubes.filter(
            tagname=seismic_attribute,
            realization=realization,
            iteration=self._iteration_name,
            time=time_filter,
            # is_observation=observed,  # Does not work for observed. Only handles observed on case level?
        )

        # Filter on observed
        cubes = []
        for cube in cube_collection:
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
