import sys
from typing import List
import logging
import asyncio

import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient

from src.services.summary_vector_statistics import compute_vector_statistics_table, compute_vector_statistics
from ..summary_access import SummaryAccess, RealizationVector, Frequency
from ..sumo_explore import SumoExplore


async def test_summary_access(summary_access: SummaryAccess) -> None:
    vector_info_list = await summary_access.get_available_vectors()
    if len(vector_info_list) == 0:
        print("\n\nNo summary vectors found, giving up!\n")
        return
    
    # print("\n\nVECTOR_INFO\n-----------------------")
    # for vector_info in vector_info_list:
    #     print(vector_info)


    # vector_names = [vector_info.name for vector_info in vector_info_list]
    # vector_table, _vector_meta = await summary_access.get_vectors_table_single_real(
    #     vector_names=vector_names, resampling_frequency=Frequency.DAILY, realization=1
    # )
    # print("\n\nSINGLE_REAL\n-----------------------")
    # print(vector_table.shape)

    # return

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=None, realizations=None
    )
    print("\n\nRAW\n-----------------------")
    print(vector_table.shape)

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.DAILY, realizations=None
    )
    print("\n\nDAILY\n-----------------------")
    print(vector_table.shape)

    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print("\n\nYEARLY\n-----------------------")
    print(vector_table)
    print(vector_table.shape)

    print("\n\nYEARLY - only real 0\n-----------------------")
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

    print("\n\nYEARLY\n-----------------------")
    vector_table, _vector_meta = await summary_access.get_vector_table(
        vector_name="FOPT", resampling_frequency=Frequency.YEARLY, realizations=None
    )
    print(vector_table)

    print("\n\nSTATS table\n-----------------------")
    stat_table = compute_vector_statistics_table(vector_table, "FOPT", None)
    if not stat_table:
        raise RuntimeError("No STATS table")
    print(stat_table)
    print(stat_table.schema)

    print("\n\nSTATS\n-----------------------")
    vec_stats = compute_vector_statistics(vector_table, "FOPT", None)
    print(vec_stats)


async def main() -> None:
    print("\n\n")
    print("## Running dev_summary_access_test_driver")
    print("## =================================================")

    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s",
    )
    logging.getLogger("").setLevel(level=logging.DEBUG)
    logging.getLogger("httpx").setLevel(level=logging.WARNING)
    logging.getLogger("httpcore").setLevel(level=logging.INFO)
    logging.getLogger("msal").setLevel(level=logging.INFO)
    logging.getLogger("urllib3").setLevel(level=logging.INFO)

    logging.getLogger("src.services.sumo_access").setLevel(level=logging.DEBUG)


    dummy_sumo_client = SumoClient("prod")
    access_token = dummy_sumo_client.auth.get_token()

    explore = SumoExplore(access_token=access_token)
    #case_list = await explore.get_cases(field_identifier="DROGON")
    #case_list = await explore.get_cases(field_identifier="JOHAN SVERDRUP")
    case_list = await explore.get_cases(field_identifier="SNORRE")
    # for case_info in case_list:
    #     print(case_info)


    sumo_case_id = "11167ec3-41f7-452c-8a08-38466df6bb97"
    sumo_case_id = "e2c7ca0a-8087-4e78-a0f5-121632af3d7b" # Sverdrup, no vectors
    sumo_case_id = "4582d741-ee41-485b-b2ea-912a7d7dc57c" # Snorre
    sumo_case_name = None
    for case_info in case_list:
        if case_info.uuid == sumo_case_id:
            sumo_case_name = case_info.name

    if not sumo_case_name:
        print("The sumo case id was not found")
        sys.exit(1)

    iteration_list = await explore.get_iterations(sumo_case_id)
    print("\n\n")
    for iteration_info in iteration_list:
        print(iteration_info)

    iteration_name = iteration_list[0].name
    summary_access = await SummaryAccess.from_case_uuid(
        access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name
    )
    await test_summary_access(summary_access)


# Running:
#   python -m src.services.sumo_access.dev.dev_summary_access_test_driver
# -------------------------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(main())
