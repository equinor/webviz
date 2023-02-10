from typing import List

import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient

from .summary_access import SummaryAccess, VectorRealizationData
from .sumo_explore import SumoExplore



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
        exit(1)

    iterations = explore.get_iterations(sumo_case_id)
    print("\n\n")
    print(iterations)

    iteration_name = iterations[0].name
    summary_access = SummaryAccess(access_token=access_token, case_uuid=sumo_case_id, iteration_name=iteration_name)

    vector_names = summary_access.get_vector_names()
    print("\n\n")
    print(vector_names)

    arrow_table: pa.Table = summary_access.get_vector_realizations_data_as_arrow_table("FOPT")
    print("\n\n")
    print(arrow_table)

    vector_data_arr: List[VectorRealizationData] = summary_access.get_vector_realizations_data("FOPT")
    print("\n\n")
    print(vector_data_arr[0])


# Running:
#   python -m src.services.sumo_access.dev_sumo_access_test_driver
# -------------------------------------------------------------------------
if __name__ == "__main__":
    main()
