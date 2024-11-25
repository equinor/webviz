import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.sumo_access.summary_types import Frequency, VectorMetadata
from primary.services.service_exceptions import InvalidDataError, Service

import asyncio


def _is_valid_vector_table(vector_table: pa.Table, vector_name: str) -> bool:
    """
    Check if the vector table is valid.

    Expect the table to contain the following columns: DATE, REAL, vector_name.
    """
    expected_columns = {"DATE", "REAL", vector_name}
    if set(vector_table.column_names) != expected_columns:
        unexpected_columns = set(vector_table.column_names) - expected_columns
        raise InvalidDataError(f"Unexpected columns in table {unexpected_columns}", Service.SUMO)


def _create_delta_vector_table(
    first_vector_table: pa.Table, second_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.

    `Note`: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.
    """
    _is_valid_vector_table(first_vector_table, vector_name)
    _is_valid_vector_table(second_vector_table, vector_name)

    joined_vector_table = first_vector_table.join(
        second_vector_table, keys=["DATE", "REAL"], join_type="inner", right_suffix="_second"
    )
    delta_vector = pc.subtract(
        joined_vector_table.column(vector_name), joined_vector_table.column(f"{vector_name}_second")
    )

    # TODO: Should a schema be defined for the delta vector?
    delta_table = pa.table(
        {
            "DATE": joined_vector_table.column("DATE"),
            "REAL": joined_vector_table.column("REAL"),
            vector_name: delta_vector,
        }
    )

    return delta_table


async def create_delta_vector_table_async(
    first_access: SummaryAccess,
    second_access: SummaryAccess,
    vector_name: str,
    resampling_frequency: Frequency,
    realizations: list[int] | None,
) -> tuple[pa.Table, VectorMetadata]:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.

    `Note`: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.
    """
    # Get tables parallel
    # - Resampled data is assumed to be s.t. dates/timestamps are comparable between ensembles and cases, i.e. timestamps
    #   for a resampling of a daily vector in both ensembles should be the same
    (first_vector_table_pa, first_metadata), (second_vector_table_pa, _) = await asyncio.gather(
        first_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=resampling_frequency,
            realizations=realizations,
        ),
        second_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=resampling_frequency,
            realizations=realizations,
        ),
    )

    # Create delta ensemble data
    delta_table = _create_delta_vector_table(first_vector_table_pa, second_vector_table_pa, vector_name)

    # TODO: Fix correct metadata for delta vector
    delta_vector_metadata = VectorMetadata(
        name=first_metadata.name,
        unit=first_metadata.unit,
        is_total=first_metadata.is_total,
        is_rate=first_metadata.is_rate,
        is_historical=first_metadata.is_historical,
        keyword=first_metadata.keyword,
        wgname=first_metadata.wgname,
        get_num=first_metadata.get_num,
    )

    return delta_table, delta_vector_metadata
