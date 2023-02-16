import sys
from typing import List

import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient

from .summary_access import SummaryAccess, RealizationVector, Frequency
from .sumo_explore import SumoExplore
from ..summary_vector_statistics import compute_vector_statistics_table, compute_vector_statistics


def main() -> None:
    print("## Running dev_sumo_access_test_driver")
    print("## =================================================")

    dummy_sumo_client = SumoClient("prod")
    access_token = dummy_sumo_client._retrieve_token()

    explore = SumoExplore(access_token=access_token)
    cases = explore.get_cases(field_identifier="DROGON")
    print(cases)

    sumo_case_id = "0db5f2dd-aa62-407f-9ac4-0dbbe30371a2"
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
    summary_access = SummaryAccess(access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name)


    vector_names = summary_access.get_vector_names()
    print("\n\n")
    print(vector_names)

    vector_table = summary_access.get_vector_table(vector_name="FOPT", resampling_frequency=None, realizations=None)
    print("\n\nRAW")
    print(vector_table.shape)

    vector_table = summary_access.get_vector_table(vector_name="FOPT", resampling_frequency=Frequency.DAILY, realizations=None)
    print("\n\nDAILY")
    print(vector_table.shape)

    vector_table = summary_access.get_vector_table(vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None)
    print("\n\nYEARLY")
    print(vector_table)
    print(vector_table.shape)

    print("\n\nYEARLY - only real 0")
    vector_table = summary_access.get_vector_table(vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=[0])
    vector_table = vector_table.filter(pa.compute.equal(vector_table["REAL"], 0))
    print(vector_table)
    print(vector_table.shape)

    vector_arr: List[RealizationVector] = summary_access.get_vector("FOPT", resampling_frequency=Frequency.YEARLY, realizations=None)
    print("\n\n")
    print(f"{len(vector_arr)=}")
    print(vector_arr[0])



    print("\n\nYEARLY")
    vector_table = summary_access.get_vector_table(vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None)
    print(vector_table)

    print("\n\nSTATS table")
    stat_table = compute_vector_statistics_table(vector_table, "FOPT", None)
    assert stat_table
    print(stat_table)
    print(stat_table.schema)

    print("\n\nSTATS")
    vec_stats = compute_vector_statistics(vector_table, "FOPT", None)
    print(vec_stats)


# Running:
#   python -m src.services.sumo_access.dev_sumo_access_test_driver
# -------------------------------------------------------------------------
if __name__ == "__main__":
    main()
