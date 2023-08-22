import sys
from typing import List
import logging

import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient

from src.services.summary_vector_statistics import (
    compute_vector_statistics_table,
    compute_vector_statistics,
)
from .summary_access import SummaryAccess, RealizationVector, Frequency
from .surface_access import SurfaceAccess
from .sumo_explore import SumoExplore


def test_summary_access(summary_access: SummaryAccess) -> None:
    vector_names = summary_access.get_available_vectors()
    print("\n\n")
    print(vector_names)

    vector_table, _vector_meta = summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=None, realizations=None
    )
    print("\n\nRAW")
    print(vector_table.shape)

    vector_table, _vector_meta = summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.DAILY, realizations=None
    )
    print("\n\nDAILY")
    print(vector_table.shape)

    vector_table, _vector_meta = summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print("\n\nYEARLY")
    print(vector_table)
    print(vector_table.shape)

    print("\n\nYEARLY - only real 0")
    vector_table, _vector_meta = summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=[0]
    )
    vector_table = vector_table.filter(pa.compute.equal(vector_table["REAL"], 0))
    print(vector_table)
    print(vector_table.shape)

    vector_arr: List[RealizationVector] = summary_access.get_vector(
        "FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print("\n\n")
    print(f"{len(vector_arr)=}")
    print(vector_arr[0])

    print("\n\nYEARLY")
    vector_table, _vector_meta = summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print(vector_table)

    print("\n\nSTATS table")
    stat_table = compute_vector_statistics_table(vector_table, "FOPT", None)
    if not stat_table:
        raise RuntimeError("No STATS table")
    print(stat_table)
    print(stat_table.schema)

    print("\n\nSTATS")
    vec_stats = compute_vector_statistics(vector_table, "FOPT", None)
    print(vec_stats)


def test_surface_access(surf_access: SurfaceAccess) -> None:
    dynamic_surf_dir = surf_access.get_dynamic_surf_dir()
    print(f"{dynamic_surf_dir=}")

    static_surf_dir = surf_access.get_static_surf_dir()
    print(f"{static_surf_dir=}")

    name_idx = 0
    valid_attr_indices = static_surf_dir.valid_attributes_for_name[name_idx]
    surf_name = static_surf_dir.names[name_idx]
    surf_attr = static_surf_dir.attributes[valid_attr_indices[0]]
    surf = surf_access.get_static_surf(real_num=0, name=surf_name, attribute=surf_attr)
    print(f"{type(surf)=}")

    # surf = surf_access.get_static_surf(real_num=0, name=static_surf_dir.names[0], attribute=static_surf_dir.attributes[2])
    # print(f"{type(surf)=}")

    # dyn_surf = surf_access.get_dynamic_surf(real_num=0, name=dynamic_surf_dir.names[0], attribute=dynamic_surf_dir.attributes[0], time_or_interval_str=dynamic_surf_dir.date_strings[0])
    # print(f"{type(dyn_surf)=}")

    # dyn_surf = surf_access.get_statistical_dynamic_surf(statistic_function=StatisticFunction.MEAN, name=dynamic_surf_dir.names[0], attribute=dynamic_surf_dir.attributes[0], time_or_interval_str=dynamic_surf_dir.date_strings[0])
    # print(f"{type(dyn_surf)=}")


def main() -> None:
    print("## Running dev_sumo_access_test_driver")
    print("## =================================================")

    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s",
    )
    # logging.getLogger("").setLevel(level=logging.DEBUG)
    logging.getLogger("src.services.sumo_access").setLevel(level=logging.DEBUG)

    # dummy_sumo_client = SumoClient("prod")
    dummy_sumo_client = SumoClient("dev")
    access_token = dummy_sumo_client._retrieve_token()  # pylint: disable=protected-access

    explore = SumoExplore(access_token=access_token)
    cases = explore.get_cases(field_identifier="DROGON")
    print(cases)

    # sumo_case_id = "0db5f2dd-aa62-407f-9ac4-0dbbe30371a2"
    sumo_case_id = "10f41041-2c17-4374-a735-bb0de62e29dc"
    sumo_case_name = None
    for case_info in cases:
        if case_info.uuid == sumo_case_id:
            sumo_case_name = case_info.name

    if not sumo_case_name:
        print("The sumo case id was not found")
        sys.exit(1)

    iterations = explore.get_iterations(sumo_case_id)
    print("\n\n")
    print(iterations)

    iteration_name = iterations[0].name

    # summary_access = SummaryAccess(access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name)
    # test_summary_access(summary_access)

    surface_access = SurfaceAccess(access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name)
    test_surface_access(surface_access)


# Running:
#   python -m src.services.sumo_access.dev_sumo_access_test_driver
# -------------------------------------------------------------------------
if __name__ == "__main__":
    main()
