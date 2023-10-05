import sys
from typing import List
import logging
import asyncio

import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient

from src.services.summary_vector_statistics import (
    compute_vector_statistics_table,
    compute_vector_statistics,
)
from .summary_access import SummaryAccess, RealizationVector, Frequency

from .sumo_explore import SumoExplore


async def test_summary_access(summary_access: SummaryAccess) -> None:
    vector_names = await summary_access.get_available_vectors()
    print("\n\n")
    print(vector_names)

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=None, realizations=None
    )
    print("\n\nRAW")
    print(vector_table.shape)

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.DAILY, realizations=None
    )
    print("\n\nDAILY")
    print(vector_table.shape)

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print("\n\nYEARLY")
    print(vector_table)
    print(vector_table.shape)

    print("\n\nYEARLY - only real 0")
    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=[0]
    )
    vector_table = vector_table.filter(pa.compute.equal(vector_table["REAL"], 0))
    print(vector_table)
    print(vector_table.shape)

    vector_arr: List[RealizationVector] = await summary_access.get_vector(
        "FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print("\n\n")
    print(f"{len(vector_arr)=}")
    print(vector_arr[0])

    print("\n\nYEARLY")
    vector_table, _vector_meta = await summary_access.get_vector_table(
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


async def main() -> None:
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
    cases = await explore.get_cases(field_identifier="DROGON")
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

    # iteration_name = iterations[0].name

    # summary_access = SummaryAccess(access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name)
    # test_summary_access(summary_access)


# Running:
#   python -m asyncio src.services.sumo_access.dev_sumo_access_test_driver
# -------------------------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(main())
