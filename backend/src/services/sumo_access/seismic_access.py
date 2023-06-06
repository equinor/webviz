import logging
from io import BytesIO
from typing import List, Optional, Tuple


import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection
from fmu.sumo.explorer.objects.cube_collection import CubeCollection
from sumo.wrapper import SumoClient
from ..types.seismic_types import SeismicCubeSchema, SeismicCubeVdsHandle

from ._helpers import create_sumo_client_instance

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

    def get_seismic_cube_directory(self) -> List[SeismicCubeSchema]:
        """get seismic cube directory"""

        case = self._get_sumo_case()

        seismic_collection: CubeCollection = case.cubes.filter(iteration=self._iteration_name, realization=1)
        cubes: dict = {}
        for cube in seismic_collection:
            if cubes.get(cube.tagname) is None:
                cubes[cube.tagname] = {"timestamps": [], "timesteps": []}
            if cube.timestamp is None and cube.interval is None:
                print(f"cube {cube.tagname} has no timestamp or interval. Skipping...")
                continue
            if cube.timestamp is not None and cube.interval is not None:
                print(f"cube {cube.tagname} has both timestamp and interval. Skipping...")
                continue
            if cube.timestamp is not None:
                cubes[cube.tagname]["timestamps"].append(cube.timestamp)
            if cube.interval is not None:
                cubes[cube.tagname]["timesteps"].append(sumo_time_interval_to_string(cube.interval))

        cubes = dict(sorted(cubes.items()))
        list_of_seismic_cubes: List[SeismicCubeSchema] = []

        for cube_name, cube in cubes.items():
            list_of_seismic_cubes.append(
                SeismicCubeSchema(
                    name=cube_name,
                    timestamps=sorted(cube["timestamps"]),
                    timesteps=sorted(cube["timesteps"]),
                )
            )
        return list_of_seismic_cubes

    def get_vds_handle(
        self,
        cube_tagname: str,
        realization: int,
        iteration: str,
        timestamp: Optional[str] = None,
        timestep: Optional[str] = None,
    ) -> SeismicCubeVdsHandle:
        """get vds handle for a cube"""
        case = self._get_sumo_case()

        cube_collection: CubeCollection = case.cubes.filter(
            tagname=cube_tagname,
            realization=realization,
            iteration=iteration,
        )

        if not cube_collection:
            raise ValueError(f"No sumo cubes found {cube_tagname=}, {realization=}, {iteration=}")

        if timestamp is not None:
            cube = next((cube for cube in cube_collection if cube.timestamp == timestamp), None)
            if cube is None:
                raise ValueError(f"timestamp {timestamp} not found for cube {cube_tagname}")
            return SeismicCubeVdsHandle(
                sas_token=cube.sas,
                vds_url=clean_vds_url(cube.url),
            )

        if timestep is not None:
            timestep = string_to_sumo_time_interval(timestep)
            cube = next((cube for cube in cube_collection if cube.interval == timestep), None)
            if cube is None:
                raise ValueError(f"Timestep {timestep} not found for cube {cube_tagname}")
            return SeismicCubeVdsHandle(
                sas_token=cube.sas,
                vds_url=clean_vds_url(cube.url),
            )

        raise ValueError("timestep or interval must be set")


def sumo_time_interval_to_string(interval: Tuple[str, str]) -> str:
    """convert sumo intervals to strings"""
    return f"{interval[0]}--{interval[1]}"


def string_to_sumo_time_interval(interval: str) -> Tuple[str, str]:
    """convert sumo intervals to strings"""
    return tuple(interval.split("--"))


def clean_vds_url(vds_url: str) -> str:
    """clean vds url"""
    return vds_url.replace(":443", "")
