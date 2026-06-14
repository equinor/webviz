import asyncio
import logging
from collections.abc import Awaitable
from typing import Callable
from dataclasses import dataclass

import pyarrow as pa

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table

from webviz_services.service_exceptions import InvalidDataError, Service


LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, kw_only=True)
class DerivedTableInfo:
    vector_names: list[str]
    source_obj_uuids: list[str]


@dataclass(frozen=True, kw_only=True)
class _TableItem:
    vec_name: str
    table: pa.Table
    obj_uuid: str


ProgressMsgCallback = Callable[[str], Awaitable[None]]

async def create_derived_smry_table_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, table_name: str | None, vector_names: list[str], progress_cb: ProgressMsgCallback) -> tuple[pa.Table, DerivedTableInfo]:

    sc_basis = SearchContext(sumo=sumo_client).tables.filter(
        uuid=case_uuid,
        ensemble=ensemble_name,
        name=table_name,
        content=["timeseries", "simulationtimeseries"],
    )

    # !!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!
    await asyncio.sleep(2)

    num_vecs = len(vector_names)

    # Serial implementation
    # ------------------------------------------------------
    table_arr: list[_TableItem] = []
    for i, vector_name in enumerate(vector_names):
        await progress_cb(f"Getting summary vector {i + 1}/{num_vecs}: {vector_name}")
        sc_vec = sc_basis.filter(column=vector_name)
        vec_table_obj = await sc_vec.aggregation_async(column=vector_name, operation="collection")
        if not isinstance(vec_table_obj, Table):
            raise InvalidDataError("Did not get expected object type of Table for table aggregation", Service.SUMO)

        vec_table_pa = await vec_table_obj.to_arrow_async()
        table_arr.append(_TableItem(vec_name=vector_name, table=vec_table_pa, obj_uuid=vec_table_obj.uuid))



    # Concurrent implementation
    # ------------------------------------------------------
    # completed_count = 0
    # semaphore = asyncio.Semaphore(20)

    # async def _fetch_one_vector(vector_name: str) -> _TableItem:
    #     nonlocal completed_count
    #     async with semaphore:
    #         sc_vec = sc_basis.filter(column=vector_name)
    #         vec_table_obj = await sc_vec.aggregation_async(column=vector_name, operation="collection")
    #         if not isinstance(vec_table_obj, Table):
    #             raise InvalidDataError("Did not get expected object type of Table for table aggregation", Service.SUMO)
    #         vec_table_pa = await vec_table_obj.to_arrow_async()
    #     completed_count += 1
    #     await progress_cb(f"Fetched {completed_count}/{num_vecs} vectors from Sumo")
    #     return _TableItem(vec_name=vector_name, table=vec_table_pa, obj_uuid=vec_table_obj.uuid)


    # fetch_tasks: dict[str, asyncio.Task[_TableItem]] = {}
    # async with asyncio.TaskGroup() as tg:
    #     for vector_name in vector_names:
    #         fetch_tasks[vector_name] = tg.create_task(_fetch_one_vector(vector_name))

    # # Preserve original ordering
    # table_arr: list[_TableItem] = [fetch_tasks[vec_name].result() for vec_name in vector_names]



    await progress_cb(f"Combining summary vector tables for {num_vecs} vectors")
    first_vec_name = table_arr[0].vec_name
    first_table = table_arr[0].table
    first_date_column = first_table.column("DATE")
    first_real_column = first_table.column("REAL")
    for i in range(1, len(table_arr)):
        vec_name = table_arr[i].vec_name
        src_table = table_arr[i].table
        real_column = src_table.column("REAL")
        date_column = src_table.column("DATE")
        if not first_date_column.equals(date_column):
            raise InvalidDataError(
                f"The DATE columns are not equal: DATE values in aggregated table for {first_vec_name} differ from aggregated table for {vec_name}.", Service.SUMO)
        if not first_real_column.equals(real_column):
            raise InvalidDataError(
                f"The REAL columns are not equal: REAL values in aggregated table for {first_vec_name} differ from aggregated table for {vec_name}.", Service.SUMO)

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if "FGIP" in vector_names:
        LOGGER.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        LOGGER.error("!!!!!!!!!!Injecting dummy error for vector to test error handling in derived table creation")
        LOGGER.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        raise InvalidDataError(f"DUMMY ERROR", Service.SUMO)


    # Now we can merge the tables by appending the "value" columns
    merged_table = first_table
    for i in range(1, len(table_arr)):
        vec_name = table_arr[i].vec_name
        src_table = table_arr[i].table
        merged_table = merged_table.append_column(src_table.field(vec_name), src_table.column(vec_name))

    info = DerivedTableInfo(
        vector_names=[holder.vec_name for holder in table_arr],
        source_obj_uuids=[holder.obj_uuid for holder in table_arr],
    )

    return merged_table, info

