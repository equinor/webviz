import asyncio
#import json
import logging
from dataclasses import dataclass

import redis.asyncio as redis
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from webviz_pkg.core_utils.timestamp_utils import timestamp_utc_ms_to_iso_str

from primary.services.utils.authenticated_user import AuthenticatedUser

from .sumo_client_factory import create_sumo_client

_REDIS_KEY_PREFIX = "sumo_fingerprinter"

LOGGER = logging.getLogger(__name__)


class SumoFingerprinterFactory:
    _instance = None

    def __init__(self, redis_client: redis.Redis):
        self._redis_client: redis.Redis = redis_client

    @classmethod
    def initialize(cls, redis_url: str) -> None:
        if cls._instance is not None:
            raise RuntimeError("SumoFingerprinterFactory is already initialized")

        redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        cls._instance = cls(redis_client)

    @classmethod
    def get_instance(cls) -> "SumoFingerprinterFactory":
        if cls._instance is None:
            raise RuntimeError("SumoFingerprinterFactory is not initialized, call initialize() first")
        return cls._instance

    def get_fingerprinter_for_user(
        self, authenticated_user: AuthenticatedUser, cache_ttl_s: int
    ) -> "SumoFingerprinter":
        if not authenticated_user:
            raise ValueError("An authenticated user must be specified")

        return SumoFingerprinter(authenticated_user, self._redis_client, cache_ttl_s)


class SumoFingerprinter:
    def __init__(self, authenticated_user: AuthenticatedUser, redis_client: redis.Redis, cache_ttl_s: int):
        self._access_token: str = authenticated_user.get_sumo_access_token()
        self._sumo_client: SumoClient = create_sumo_client(self._access_token)
        self._user_id = authenticated_user.get_user_id()
        self._redis_client = redis_client
        self._cache_ttl_s = cache_ttl_s

    async def get_or_compute_ensemble_fingerprint_async(
        self, case_uuid: str, ensemble_name: str, class_name: str | None
    ) -> str | None:
        perf_metrics = PerfMetrics()

        redis_key = self._make_full_redis_key(case_uuid=case_uuid, ensemble_name=ensemble_name, class_name=class_name)

        fingerprint = await self._redis_client.get(redis_key)
        perf_metrics.record_lap("redis-get")
        if fingerprint is not None:
            LOGGER.debug(
                f"get_or_compute_ensemble_fingerprint_async() got cached fingerprint in: {perf_metrics.to_string()} [{fingerprint=}]"
            )
            return fingerprint

        fingerprint = await compute_ensemble_fingerprint_async(self._sumo_client, case_uuid, ensemble_name, class_name)
        perf_metrics.record_lap("compute")
        if fingerprint is None:
            return None

        asyncio.create_task(self._redis_client.set(name=redis_key, value=fingerprint, ex=self._cache_ttl_s))
        perf_metrics.record_lap("schedule-redis-set")

        LOGGER.debug(
            f"get_or_compute_ensemble_fingerprint_async() computed fingerprint in: {perf_metrics.to_string()} [{fingerprint=}]"
        )

        return fingerprint

    def _make_full_redis_key(self, case_uuid: str, ensemble_name: str, class_name: str | None) -> str:
        return (
            f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:case:{case_uuid}:ens:{ensemble_name}:class:{class_name or 'ALL'}"
        )


def get_sumo_fingerprinter_for_user(authenticated_user: AuthenticatedUser, cache_ttl_s: int) -> SumoFingerprinter:
    factory = SumoFingerprinterFactory.get_instance()
    return factory.get_fingerprinter_for_user(authenticated_user, cache_ttl_s)


async def compute_ensemble_fingerprint_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, class_name: str | None
) -> str:
    perf_metrics = PerfMetrics()

    # case_digest: DocSetDigest = await _gather_case_digest_async(sumo_client, case_uuid)
    # ens_digest: DocSetDigest = await _gather_ensemble_digest_async(sumo_client, case_uuid, ensemble_name, class_name)

    async with asyncio.TaskGroup() as tg:
        case_task = tg.create_task(_gather_case_digest_async(sumo_client, case_uuid))
        case_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("case-digest"))

        ens_task = tg.create_task(_gather_ensemble_digest_async(sumo_client, case_uuid, ensemble_name, class_name))
        ens_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("ens-digest"))

    perf_metrics.reset_lap_timer()
    case_digest: DocSetDigest = case_task.result()
    ens_digest: DocSetDigest = ens_task.result()

    case_time_str = "N/A"
    ens_time_str = "N/A"
    if case_digest.max_timestamp_utc_ms > 0:
        case_time_str = timestamp_utc_ms_to_iso_str(case_digest.max_timestamp_utc_ms)
    if ens_digest.max_timestamp_utc_ms > 0:
        ens_time_str = timestamp_utc_ms_to_iso_str(ens_digest.max_timestamp_utc_ms)
    LOGGER.debug(
        f"compute_ensemble_fingerprint_async() - case: time={case_time_str}, docs={case_digest.doc_count}, checksum={case_digest.checksum}"
    )
    LOGGER.debug(
        f"compute_ensemble_fingerprint_async() - ens:  time={ens_time_str}, docs={ens_digest.doc_count}, checksum={ens_digest.checksum}"
    )

    max_timestamp = max(0, case_digest.max_timestamp_utc_ms)
    max_timestamp = max(max_timestamp, ens_digest.max_timestamp_utc_ms)
    max_time_iso_str = timestamp_utc_ms_to_iso_str(max_timestamp) if max_timestamp > 0 else "NO_TS"

    fingerprint = f"{max_time_iso_str}__case:{case_digest.doc_count}:{case_digest.checksum}__ens:{ens_digest.doc_count}:{ens_digest.checksum}"

    LOGGER.debug(f"compute_ensemble_fingerprint_async() took: {perf_metrics.to_string()} - fingerprint: {fingerprint}")

    return fingerprint


@dataclass(frozen=True)
class DocSetDigest:
    doc_count: int
    checksum: str
    max_timestamp_utc_ms: int  # -1 if no timestamp


async def _gather_case_digest_async(sumo_client: SumoClient, case_uuid: str) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=False, aggregation=False)

    query_dict = _build_case_level_docs_query_dict(case_uuid)

    # checksum_res = await _run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    # doc_count = await sc.length_async()
    # max_timestamp_utc_ms = await sc.metrics.max_async("_sumo.timestamp")

    async with asyncio.TaskGroup() as tg:
        checksum_task = tg.create_task(_run_query_and_do_checksum_agg_async(sumo_client, query_dict))
        doc_count_task = tg.create_task(search_context.length_async())
        max_timestamp_task = tg.create_task(search_context.metrics.max_async("_sumo.timestamp"))

    checksum_res = await checksum_task
    doc_count = await doc_count_task
    max_timestamp_utc_ms = await max_timestamp_task

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    return DocSetDigest(
        doc_count=doc_count, checksum=checksum_res.fnv1a_checksum, max_timestamp_utc_ms=max_timestamp_utc_ms
    )


async def _gather_ensemble_digest_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, class_name: str | None
) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=ensemble_name, aggregation=False)
    if class_name is not None:
        search_context = search_context.filter(cls=class_name)

    query_dict = _build_ensemble_level_docs_query_dict(case_uuid, ensemble_name, class_name)

    # checksum_res = await _run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    # doc_count = await sc.length_async()
    # max_timestamp_utc_ms = await sc.metrics.max_async("_sumo.timestamp")

    async with asyncio.TaskGroup() as tg:
        checksum_task = tg.create_task(_run_query_and_do_checksum_agg_async(sumo_client, query_dict))
        doc_count_task = tg.create_task(search_context.length_async())
        max_timestamp_task = tg.create_task(search_context.metrics.max_async("_sumo.timestamp"))

    checksum_res = await checksum_task
    doc_count = await doc_count_task
    max_timestamp_utc_ms = await max_timestamp_task

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    return DocSetDigest(
        doc_count=doc_count, checksum=checksum_res.fnv1a_checksum, max_timestamp_utc_ms=max_timestamp_utc_ms
    )


def _build_case_level_docs_query_dict(case_uuid: str) -> dict:
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


def _build_ensemble_level_docs_query_dict(case_uuid: str, ensemble_name: str, class_name: str | None) -> dict:
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


async def _run_query_and_do_checksum_agg_async(sumo_client: SumoClient, query_dict: dict) -> ChecksumResult:
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
                        if (doc['_sumo.blob_name.keyword'].size() == 0) return;
                        def s = doc.get('_sumo.blob_name.keyword').value;
                        long h = 1469598103934665603L;    // FNV-1a offset
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
