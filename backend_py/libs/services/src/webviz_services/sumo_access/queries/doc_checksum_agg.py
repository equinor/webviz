import logging
from dataclasses import dataclass

from sumo.wrapper import SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics


LOGGER = logging.getLogger(__name__)


def build_case_level_docs_query_dict(case_uuid: str) -> dict:
    must_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"term": {"fmu.case.uuid.keyword": case_uuid}})
    must_not_arr.append({"exists": {"field": "fmu.ensemble"}})
    must_not_arr.append({"exists": {"field": "fmu.iteration"}})

    query_dict = {
        "bool": {
            "must": must_arr,
            "must_not": must_not_arr,
        }
    }

    return query_dict


def build_ensemble_level_docs_query_dict(case_uuid: str, ensemble_name: str, class_name: str | None) -> dict:
    must_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"term": {"fmu.case.uuid.keyword": case_uuid}})
    must_arr.append({"term": {"fmu.ensemble.name.keyword": ensemble_name}})

    if class_name is not None:
        must_arr.append({"term": {"class.keyword": class_name}})

    must_not_arr.append({"exists": {"field": "fmu.aggregation"}})

    query_dict = {
        "bool": {
            "must": must_arr,
            "must_not": must_not_arr,
        }
    }

    return query_dict


@dataclass(frozen=True)
class ChecksumResult:
    fnv1a_checksum: str
    docs_in_checksum: int
    docs_total: int


async def run_query_and_do_checksum_agg_async(sumo_client: SumoClient, query_dict: dict) -> ChecksumResult:
    perf_metrics = PerfMetrics()

    search_payload = {
        "track_total_hits": True,
        "_source": True,
        "size": 0,
        "query": query_dict,
        "aggs": {
            "mytest": {
                "scripted_metric": {
                    "init_script": "state.h = 0L; state.count = 0L; state.total = 0L",
                    "map_script": """
                        state.total += 1L;
                        if (doc['file.checksum_md5.keyword'].size() == 0) return;
                        def s = doc.get('file.checksum_md5.keyword').value;
                        long h = -3750763034362895579L;    // FNV-1a offset (0xcbf29ce484222325)
                        for (int i = 0; i < s.length(); i++) {
                            h ^= (long) s.charAt(i);
                            h *= 1099511628211L;
                        }
                        state.h ^= h;
                        state.count += 1L;
                    """,
                    "combine_script": "return state;",
                    "reduce_script": """
                        long h = 0L; long c = 0L; long t = 0L;
                        for (st in states) { h ^= st.h; c += st.count; t += st.total }
                        return ['checksum': Long.toHexString(h), 'docs_in_checksum': c, 'docs_total': t];
                    """,
                }
            }
        },
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    # LOGGER.debug("-----------------")
    # LOGGER.debug(json.dumps(response_dict, indent=2))
    # LOGGER.debug("-----------------")
    # LOGGER.debug(f"{response_dict['took']=}")

    elastic_time_ms = response_dict.get("took", -1)
    elastic_hit_count = response_dict.get("hits", {}).get("total", {}).get("value", -1)

    agg_value_dict = response_dict.get("aggregations", {}).get("mytest", {}).get("value", {})
    fnv_hash = agg_value_dict.get("checksum", None)
    docs_in_checksum = agg_value_dict.get("docs_in_checksum", 0)
    docs_total = agg_value_dict.get("docs_total", 0)

    LOGGER.debug(
        f"_run_query_and_do_checksum_agg_async() took: {perf_metrics.to_string()} ({elastic_time_ms=}, {elastic_hit_count=}, {docs_in_checksum=}, {docs_total=})- checksum: {fnv_hash=}"
    )

    return ChecksumResult(
        fnv1a_checksum=fnv_hash,
        docs_in_checksum=docs_in_checksum,
        docs_total=docs_total,
    )
