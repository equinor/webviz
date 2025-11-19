import asyncio

import logging
from dataclasses import dataclass

import redis.asyncio as redis
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_core_utils.timestamp_utils import timestamp_utc_ms_to_iso_str

from webviz_services.utils.authenticated_user import AuthenticatedUser

from .queries.doc_checksum_agg import build_case_level_docs_query_dict, build_ensemble_level_docs_query_dict
from .queries.doc_checksum_agg import run_query_and_do_checksum_agg_async
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

    async def get_or_calc_ensemble_fp_async(self, case_uuid: str, ensemble_name: str) -> str:
        """
        Get from cache or calculate the fingerprint string for contents of an ensemble.
        See calc_ensemble_fp_async() for details.
        """
        perf_metrics = PerfMetrics()

        redis_key = self._make_full_redis_key(case_uuid=case_uuid, ensemble_name=ensemble_name)

        cached_fp = await self._redis_client.get(redis_key)
        perf_metrics.record_lap("redis-get")
        if cached_fp is not None:
            # LOGGER.debug(f"get_or_calc_ensemble_fp_async() - from cache in: {perf_metrics.to_string()} [{cached_fp=}]")
            return cached_fp

        new_fp = await calc_ensemble_fp_async(self._sumo_client, case_uuid, ensemble_name, None)
        perf_metrics.record_lap("calc-fp")

        # Schedule the Redis set call, but don't await it
        asyncio.create_task(self._redis_client.set(name=redis_key, value=new_fp, ex=self._cache_ttl_s))
        perf_metrics.record_lap("schedule-redis-set")

        # LOGGER.debug(f"get_or_calc_ensemble_fp_async() - calculated in: {perf_metrics.to_string()} [{new_fp=}]")
        return new_fp

    async def calc_and_store_ensemble_fp_async(self, case_uuid: str, ensemble_name: str) -> str:
        """
        Calculate and unconditionally store fingerprint string for contents of an ensemble, also returning the result.
        This method does not check the cache first, it will always calculate a new fingerprint and write it to the cache.
        See calc_ensemble_fp_async() for details.
        """
        perf_metrics = PerfMetrics()

        redis_key = self._make_full_redis_key(case_uuid=case_uuid, ensemble_name=ensemble_name)

        new_fp = await calc_ensemble_fp_async(self._sumo_client, case_uuid, ensemble_name, None)
        perf_metrics.record_lap("calc-fp")

        await self._redis_client.set(name=redis_key, value=new_fp, ex=self._cache_ttl_s)
        perf_metrics.record_lap("redis-set")

        # LOGGER.debug(f"calc_and_store_ensemble_fp_async() - calculated in: {perf_metrics.to_string()} [{new_fp=}]")
        return new_fp

    def _make_full_redis_key(self, case_uuid: str, ensemble_name: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:case:{case_uuid}:ens:{ensemble_name}"


def get_sumo_fingerprinter_for_user(authenticated_user: AuthenticatedUser, cache_ttl_s: int) -> SumoFingerprinter:
    factory = SumoFingerprinterFactory.get_instance()
    return factory.get_fingerprinter_for_user(authenticated_user, cache_ttl_s)


async def calc_ensemble_fp_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, class_name: str | None
) -> str:
    """
    Calculate fingerprint string for contents of an ensemble, optionally filtered by document class name.

    Note that the ensemble fingerprint is calculated based on both the documents in the ensemble
    and the documents in the parent case.

    The fingerprint string has the format:
        {max_timestamp}__case:{num_docs_in_case}:{case_checksum}__ens:{num_docs_in_ens}:{ens_checksum}
    where max_timestamp is the maximum timestamp of any document in either the ensemble or the parent case.
    """
    perf_metrics = PerfMetrics()

    # case_digest: DocSetDigest = await _gather_case_digest_old_elastic_async(sumo_client, case_uuid)
    # perf_metrics.record_lap("case-digest")
    # ens_digest: DocSetDigest = await _gather_ensemble_digest_old_elastic_async(sumo_client, case_uuid, ensemble_name, class_name)
    # perf_metrics.record_lap("ens-digest")

    async with asyncio.TaskGroup() as tg:
        case_task = tg.create_task(_gather_case_digest_async(sumo_client, case_uuid))
        case_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("case-digest"))

        ens_task = tg.create_task(_gather_ensemble_digest_async(sumo_client, case_uuid, ensemble_name, class_name))
        ens_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("ens-digest"))

    perf_metrics.reset_lap_timer()

    case_digest: DocSetDigest = case_task.result()
    ens_digest: DocSetDigest = ens_task.result()

    # LOGGER.debug(f"calc_ensemble_fp_async() case: {_digest_to_str(case_digest)}")
    # LOGGER.debug(f"calc_ensemble_fp_async() ens:  {_digest_to_str(ens_digest)}")

    # Choose the max timestamp from either the case or the ensemble
    max_timestamp = max(0, case_digest.max_timestamp_utc_ms)
    max_timestamp = max(max_timestamp, ens_digest.max_timestamp_utc_ms)
    max_time_iso_str = timestamp_utc_ms_to_iso_str(max_timestamp) if max_timestamp > 0 else "NO_TS"

    fingerprint = f"{max_time_iso_str}__case:{case_digest.total_num_docs}:{case_digest.checksum}__ens:{ens_digest.total_num_docs}:{ens_digest.checksum}"

    # LOGGER.debug(f"calc_ensemble_fp_async() took: {perf_metrics.to_string()} - fingerprint: {fingerprint}")

    return fingerprint


@dataclass(frozen=True)
class DocSetDigest:
    total_num_docs: int
    checksum: str
    num_docs_in_checksum: int
    max_timestamp_utc_ms: int  # -1 if no timestamp


def _digest_to_str(digest: DocSetDigest) -> str:
    time_str = timestamp_utc_ms_to_iso_str(digest.max_timestamp_utc_ms) if digest.max_timestamp_utc_ms > 0 else "N/A"
    return f"max time={time_str}, docs fp/tot={digest.num_docs_in_checksum}/{digest.total_num_docs}, checksum={digest.checksum}"


async def _gather_case_digest_async(sumo_client: SumoClient, case_uuid: str) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=False, aggregation=False)

    async with asyncio.TaskGroup() as tg:
        fnv1a_checksum_task = tg.create_task(search_context.metrics.fnv1a_async(field="file.checksum_md5.keyword"))
        max_timestamp_task = tg.create_task(search_context.metrics.max_async("_sumo.timestamp"))

    fnv1a_res = fnv1a_checksum_task.result()
    max_timestamp_utc_ms = max_timestamp_task.result()

    checksum = fnv1a_res["value"]["checksum"]
    docs_total = fnv1a_res["value"]["docs_total"]
    docs_in_checksum = fnv1a_res["value"]["docs_in_checksum"]

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    # query_dict = build_case_level_docs_query_dict(case_uuid)
    # checksum_res = await run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    # doc_count_from_sc = await search_context.length_async()
    # LOGGER.debug("-----------------")
    # LOGGER.debug(f"{fnv1a_res=}")
    # LOGGER.debug(f"{checksum_res=}")
    # LOGGER.debug("-----------------")

    # if doc_count_from_sc != docs_total:
    #     raise RuntimeError(f"Doc count mismatch: {doc_count_from_sc=} != {docs_total=}")
    # if doc_count_from_sc != checksum_res.docs_total:
    #     raise RuntimeError(f"Doc count mismatch: {doc_count_from_sc=} != {checksum_res.docs_total=}")
    # if checksum != checksum_res.fnv1a_checksum:
    #     raise RuntimeError(f"Checksum mismatch: {checksum=} != {checksum_res.fnv1a_checksum=}")
    # if docs_in_checksum != checksum_res.docs_in_checksum:
    #     raise RuntimeError(f"Checksum mismatch: {docs_in_checksum=} != {checksum_res.docs_in_checksum=}")

    return DocSetDigest(
        total_num_docs=docs_total,
        checksum=checksum,
        num_docs_in_checksum=docs_in_checksum,
        max_timestamp_utc_ms=max_timestamp_utc_ms,
    )


async def _gather_ensemble_digest_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, class_name: str | None
) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=ensemble_name, aggregation=False)
    if class_name is not None:
        search_context = search_context.filter(cls=class_name)

    async with asyncio.TaskGroup() as tg:
        fnv1a_checksum_task = tg.create_task(search_context.metrics.fnv1a_async(field="file.checksum_md5.keyword"))
        max_timestamp_task = tg.create_task(search_context.metrics.max_async("_sumo.timestamp"))

    fnv1a_res = fnv1a_checksum_task.result()
    max_timestamp_utc_ms = max_timestamp_task.result()

    checksum = fnv1a_res["value"]["checksum"]
    docs_total = fnv1a_res["value"]["docs_total"]
    docs_in_checksum = fnv1a_res["value"]["docs_in_checksum"]

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    # query_dict = build_ensemble_level_docs_query_dict(case_uuid, ensemble_name, class_name)
    # checksum_res = await run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    # doc_count_from_sc = await search_context.length_async()
    # LOGGER.debug("-----------------")
    # LOGGER.debug(f"{fnv1a_res=}")
    # LOGGER.debug(f"{checksum_res=}")
    # LOGGER.debug("-----------------")

    # if doc_count_from_sc != docs_total:
    #     raise RuntimeError(f"Doc count mismatch: {doc_count_from_sc=} != {docs_total=}")
    # if doc_count_from_sc != checksum_res.docs_total:
    #     raise RuntimeError(f"Doc count mismatch: {doc_count_from_sc=} != {checksum_res.docs_total=}")
    # if checksum != checksum_res.fnv1a_checksum:
    #     raise RuntimeError(f"Checksum mismatch: {checksum=} != {checksum_res.fnv1a_checksum=}")
    # if docs_in_checksum != checksum_res.docs_in_checksum:
    #     raise RuntimeError(f"Checksum mismatch: {docs_in_checksum=} != {checksum_res.docs_in_checksum=}")

    return DocSetDigest(
        total_num_docs=docs_total,
        checksum=checksum,
        num_docs_in_checksum=docs_in_checksum,
        max_timestamp_utc_ms=max_timestamp_utc_ms,
    )


async def _gather_case_digest_old_elastic_async(sumo_client: SumoClient, case_uuid: str) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=False, aggregation=False)

    query_dict = build_case_level_docs_query_dict(case_uuid)

    checksum_res = await run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    doc_count_from_sc = await search_context.length_async()
    max_timestamp_utc_ms = await search_context.metrics.max_async("_sumo.timestamp")

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    return DocSetDigest(
        total_num_docs=doc_count_from_sc,
        checksum=checksum_res.fnv1a_checksum,
        num_docs_in_checksum=checksum_res.docs_in_checksum,
        max_timestamp_utc_ms=max_timestamp_utc_ms,
    )


async def _gather_ensemble_digest_old_elastic_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, class_name: str | None
) -> DocSetDigest:
    search_context = SearchContext(sumo_client).filter(uuid=case_uuid, ensemble=ensemble_name, aggregation=False)
    if class_name is not None:
        search_context = search_context.filter(cls=class_name)

    query_dict = build_ensemble_level_docs_query_dict(case_uuid, ensemble_name, class_name)

    checksum_res = await run_query_and_do_checksum_agg_async(sumo_client, query_dict)
    doc_count_from_sc = await search_context.length_async()
    max_timestamp_utc_ms = await search_context.metrics.max_async("_sumo.timestamp")

    if not isinstance(max_timestamp_utc_ms, int):
        max_timestamp_utc_ms = -1

    return DocSetDigest(
        total_num_docs=doc_count_from_sc,
        checksum=checksum_res.fnv1a_checksum,
        num_docs_in_checksum=checksum_res.docs_in_checksum,
        max_timestamp_utc_ms=max_timestamp_utc_ms,
    )
