import logging
from dataclasses import dataclass

from sumo.wrapper import SumoClient

from webviz_pkg.core_utils.perf_metrics import PerfMetrics

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class SummaryTableInfo:
    table_name: str
    column_names: list[str]


async def find_summary_vector_tables_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str
) -> list[SummaryTableInfo]:
    perf_metrics = PerfMetrics()

    query_dict = {
        "bool": {
            "must": [
                {"term": {"class": "table"}},
                {"term": {"_sumo.parent_object.keyword": case_uuid}},
                {"term": {"fmu.iteration.name.keyword": ensemble_name}},
                {"term": {"fmu.context.stage.keyword": "iteration"}},
                {"term": {"fmu.aggregation.operation.keyword": "collection"}},
                {"term": {"data.tagname.keyword": "summary"}},
                {"term": {"data.content.keyword": "timeseries"}},
            ],
        }
    }

    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "smry_tables": {
                "terms": {"field": "data.name.keyword"},
                "aggs": {
                    "smry_columns": {
                        "terms": {"field": "data.spec.columns.keyword", "size": 65535},
                    },
                },
            },
        },
        "_source": False,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    perf_metrics.set_metric("elastic-took", response_dict["took"])
    perf_metrics.record_lap("search-roundtrip")

    table_info_arr: list[SummaryTableInfo] = []
    for table_bucket in response_dict["aggregations"]["smry_tables"]["buckets"]:
        table_name = table_bucket["key"]
        column_names: list[str] = []
        for column_bucket in table_bucket["smry_columns"]["buckets"]:
            column_name = column_bucket["key"]
            column_names.append(column_name)
        table_info_arr.append(SummaryTableInfo(table_name=table_name, column_names=column_names))

    perf_metrics.record_lap("process")

    table_count = len(table_info_arr)
    LOGGER.debug(f"find_summary_vector_tables_async() - found {table_count} table(s)")
    for info in table_info_arr:
        col_count = len(info.column_names)
        LOGGER.debug(f"find_summary_vector_tables_async() - table={info.table_name}, num columns={col_count}")

    LOGGER.debug(f"find_summary_vector_tables_async() took: {perf_metrics.to_string_s()}")

    return table_info_arr
