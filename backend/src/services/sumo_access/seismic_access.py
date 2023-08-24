import logging

from typing import List, Optional, Tuple

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection
from fmu.sumo.explorer.objects.cube_collection import CubeCollection
from sumo.wrapper import SumoClient

from ..oneseismic_access.vds_types import VdsHandle

from .seismic_types import Seismic3DSurveyDirectory, Seismic4DSurveyDirectory
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

    def get_seismic_3dsurvey_directory(self) -> Seismic3DSurveyDirectory:
        case = self._get_sumo_case()
        filter_with_timestamp = TimeFilter(TimeType.TIMESTAMP)
        seismic_collection: CubeCollection = case.cubes.filter(
            iteration=self._iteration_name, realization=0, time=filter_with_timestamp, is_observation=False
        )

        attributes = sorted(seismic_collection.tagnames)
        timestamps: List[str] = seismic_collection.timestamps

        if attributes and timestamps:
            return Seismic3DSurveyDirectory(
                attributes=attributes,
                timestamps=timestamps,
            )
        return Seismic3DSurveyDirectory.create_empty()

    def get_seismic_4dsurvey_directory(self) -> Seismic4DSurveyDirectory:
        case = self._get_sumo_case()
        filter_with_intervals = TimeFilter(TimeType.INTERVAL)
        seismic_collection: CubeCollection = case.cubes.filter(
            iteration=self._iteration_name, realization=0, time=filter_with_intervals, is_observation=False
        )

        attributes = sorted(seismic_collection.tagnames)
        intervals: List[str] = [f"{interval[0]}--{interval[1]}" for interval in seismic_collection.intervals]

        if attributes and intervals:
            return Seismic4DSurveyDirectory(
                attributes=attributes,
                intervals=intervals,
            )
        return Seismic4DSurveyDirectory.create_empty()

    def get_vds_handle(
        self,
        cube_tagname: str,
        realization: int,
        iteration: str,
        timestamp: Optional[str] = None,
        timestep: Optional[str] = None,
        observed: bool = False,
    ) -> VdsHandle:
        """get vds handle for a cube"""
        case = self._get_sumo_case()

        cube_collection: CubeCollection = case.cubes.filter(
            tagname=cube_tagname,
            realization=realization,
            iteration=iteration,
        )

        cube = None
        for potential_cube in cube_collection:
            if observed and potential_cube["data"]["is_observation"]:
                cube = potential_cube
                break
            elif not observed and not potential_cube["data"]["is_observation"]:
                cube = potential_cube
                break

        if not cube and observed:
            raise ValueError(f"No observed sumo cubes found {cube_tagname=}, {realization=}, {iteration=}")
        if not cube and not observed:
            raise ValueError(f"No simulated sumo cubes found {cube_tagname=}, {realization=}, {iteration=}")

        if timestamp is not None:
            cube = next((cube for cube in cube_collection if cube.timestamp == timestamp), None)
            if cube is None:
                raise ValueError(f"timestamp {timestamp} not found for cube {cube_tagname}")
            return VdsHandle(
                sas_token=cube.sas,
                vds_url=clean_vds_url(cube.url),
            )

        if timestep is not None:
            timestep = string_to_sumo_time_interval(timestep)
            cube = next((cube for cube in cube_collection if cube.interval == timestep), None)
            if cube is None:
                raise ValueError(f"Timestep {timestep} not found for cube {cube_tagname}")
            return VdsHandle(
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
