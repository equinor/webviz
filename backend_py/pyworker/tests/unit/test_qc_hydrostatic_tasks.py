# pylint: disable=async-suffix
import asyncio
from types import SimpleNamespace
from typing import Any

import pytest

from webviz_server_schemas.pyworker.messages import (
    QcHydrostaticEquilGridPropertyCheckMsg,
    QcHydrostaticEquilVectorCheckMsg,
)
from webviz_services.operations.hydrostatic_equilibrium_check import hydrostatic_equilibrium_types as he_types
from webviz_services.service_exceptions import NoDataError, Service
from webviz_services.utils.sumo_blob_cache import SumoBlobCacheError

from pyworker.task_exceptions import TaskFailedError, TaskRetryError
from pyworker.tasks import qc_hydrostatic_equil_grid_property_check_task as grid_task
from pyworker.tasks import qc_hydrostatic_equil_vector_check_task as vector_task
from pyworker.utils.abort_signal import AbortSignal

_TIME_STEPS = he_types.TimeStepPair(
    t0_iso="2020-01-01T00:00:00", t1_iso="2021-01-01T00:00:00", time_gap_days=366.0, time_gap_ok=True
)
_VECTOR_RESULT = he_types.HydrostaticVectorCheckResult(
    time_steps=_TIME_STEPS,
    checked_vector_names=["FOPT"],
    realization_results=[],
    source_object_uuids=["vec-uuid-1", "vec-uuid-2"],
)
_GRID_RESULT = he_types.HydrostaticGridCheckRealizationResult(
    time_steps=_TIME_STEPS,
    grid_name="Geogrid",
    checked_property_names=["PRESSURE"],
    realization_result=he_types.RealizationGridCheckResult(
        realization=3, property_values=[], source_object_uuids=["grid-uuid-1"]
    ),
)


class _FakeTaskTracker:
    def __init__(self) -> None:
        self.status_messages: list[str] = []

    async def get_task_meta_async(self, task_id: str) -> Any:
        return SimpleNamespace(task_id=task_id, expected_store_key="cache::key")

    async def set_status_message_async(self, _task_id: str, status_msg: str) -> None:
        self.status_messages.append(status_msg)


class _FakeBlobCache:
    def __init__(self, put_error: Exception | None = None) -> None:
        self.puts: list[dict[str, Any]] = []
        self._put_error = put_error

    async def put_pydantic_model_async(self, cache_key: str, source_obj_uuids: list[str], model: Any) -> None:
        if self._put_error:
            raise self._put_error
        self.puts.append({"cache_key": cache_key, "source_obj_uuids": source_obj_uuids, "model": model})


class _FakeCheck:
    def __init__(self, result: Any = None, error: Exception | None = None, **kwargs: Any) -> None:
        self.init_kwargs = kwargs
        self._result = result
        self._error = error
        self.calls: list[dict[str, Any]] = []

    async def compute_vector_check_async(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return self._result

    async def compute_grid_property_check_async(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return self._result


def _make_sb_msg(msg: Any) -> Any:
    return SimpleNamespace(body=[msg.model_dump_json().encode()], message_id="m1", sequence_number=1)


def _make_abort_signal() -> AbortSignal:
    return AbortSignal(asyncio.Event())


def _patch_common(
    monkeypatch: pytest.MonkeyPatch, task_module: Any, check: _FakeCheck, blob_cache: _FakeBlobCache
) -> None:
    monkeypatch.setattr(task_module.message_decryption, "decrypt_data_to_str", lambda _data: "token")
    monkeypatch.setattr(task_module, "create_sumo_client", lambda _token: object())
    monkeypatch.setattr(task_module, "Grid3dAccess", lambda *_args: "grid3d-access")
    monkeypatch.setattr(task_module, "HydrostaticEquilibriumCheck", lambda **kwargs: _set_kwargs(check, kwargs))
    monkeypatch.setattr(task_module, "get_sumo_blob_cache_from_sumo_client", lambda _client, _op: blob_cache)


def _set_kwargs(check: _FakeCheck, kwargs: dict[str, Any]) -> _FakeCheck:
    check.init_kwargs = kwargs
    return check


def _vector_msg(realizations: list[int] | None) -> QcHydrostaticEquilVectorCheckMsg:
    return QcHydrostaticEquilVectorCheckMsg(
        user_id="u1",
        task_id="t1",
        case_uuid="case-1",
        ensemble_name="iter-0",
        t0_iso=_TIME_STEPS.t0_iso,
        t1_iso=_TIME_STEPS.t1_iso,
        realizations=realizations,
        encrypted_access_token=b"x",
    )


def _grid_msg() -> QcHydrostaticEquilGridPropertyCheckMsg:
    return QcHydrostaticEquilGridPropertyCheckMsg(
        user_id="u1",
        task_id="t1",
        case_uuid="case-1",
        ensemble_name="iter-0",
        grid_name="Geogrid",
        realization=3,
        encrypted_access_token=b"x",
    )


@pytest.mark.asyncio
async def test_vector_check_task_stores_result_with_source_uuids(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(result=_VECTOR_RESULT)
    blob_cache = _FakeBlobCache()
    monkeypatch.setattr(vector_task, "SummaryAccess", lambda *_args: "summary-access")
    _patch_common(monkeypatch, vector_task, check, blob_cache)
    tracker = _FakeTaskTracker()

    success = await vector_task.qc_hydrostatic_equil_vector_check_task_async(
        tracker, _make_sb_msg(_vector_msg([1, 2])), _make_abort_signal()  # type: ignore[arg-type]
    )

    assert success.status_msg
    assert check.calls == [{"t0_iso": _TIME_STEPS.t0_iso, "t1_iso": _TIME_STEPS.t1_iso, "realizations": [1, 2]}]
    assert check.init_kwargs["summary_access"] == "summary-access"
    assert len(blob_cache.puts) == 1
    assert blob_cache.puts[0]["cache_key"] == "cache::key"
    assert blob_cache.puts[0]["source_obj_uuids"] == ["vec-uuid-1", "vec-uuid-2"]
    assert blob_cache.puts[0]["model"] is _VECTOR_RESULT


@pytest.mark.asyncio
async def test_vector_check_task_maps_service_error_to_task_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(error=NoDataError("no vectors", Service.SUMO))
    blob_cache = _FakeBlobCache()
    monkeypatch.setattr(vector_task, "SummaryAccess", lambda *_args: "summary-access")
    _patch_common(monkeypatch, vector_task, check, blob_cache)

    with pytest.raises(TaskFailedError):
        await vector_task.qc_hydrostatic_equil_vector_check_task_async(
            _FakeTaskTracker(), _make_sb_msg(_vector_msg(None)), _make_abort_signal()  # type: ignore[arg-type]
        )

    assert not blob_cache.puts


@pytest.mark.asyncio
async def test_vector_check_task_maps_cache_write_error_to_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(result=_VECTOR_RESULT)
    blob_cache = _FakeBlobCache(put_error=SumoBlobCacheError("blob store unavailable"))
    monkeypatch.setattr(vector_task, "SummaryAccess", lambda *_args: "summary-access")
    _patch_common(monkeypatch, vector_task, check, blob_cache)

    with pytest.raises(TaskRetryError):
        await vector_task.qc_hydrostatic_equil_vector_check_task_async(
            _FakeTaskTracker(), _make_sb_msg(_vector_msg(None)), _make_abort_signal()  # type: ignore[arg-type]
        )


@pytest.mark.asyncio
async def test_grid_property_check_task_stores_result_with_nested_source_uuids(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(result=_GRID_RESULT)
    blob_cache = _FakeBlobCache()
    _patch_common(monkeypatch, grid_task, check, blob_cache)

    success = await grid_task.qc_hydrostatic_equil_grid_property_check_task_async(
        _FakeTaskTracker(), _make_sb_msg(_grid_msg()), _make_abort_signal()  # type: ignore[arg-type]
    )

    assert success.status_msg
    assert check.calls == [{"grid_name": "Geogrid", "realization": 3}]
    assert len(blob_cache.puts) == 1
    assert blob_cache.puts[0]["cache_key"] == "cache::key"
    assert blob_cache.puts[0]["source_obj_uuids"] == ["grid-uuid-1"]
    assert blob_cache.puts[0]["model"] is _GRID_RESULT


@pytest.mark.asyncio
async def test_grid_property_check_task_maps_service_error_to_task_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(error=NoDataError("no properties", Service.SUMO))
    blob_cache = _FakeBlobCache()
    _patch_common(monkeypatch, grid_task, check, blob_cache)

    with pytest.raises(TaskFailedError):
        await grid_task.qc_hydrostatic_equil_grid_property_check_task_async(
            _FakeTaskTracker(), _make_sb_msg(_grid_msg()), _make_abort_signal()  # type: ignore[arg-type]
        )

    assert not blob_cache.puts


@pytest.mark.asyncio
async def test_grid_property_check_task_maps_cache_write_error_to_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    check = _FakeCheck(result=_GRID_RESULT)
    blob_cache = _FakeBlobCache(put_error=SumoBlobCacheError("blob store unavailable"))
    _patch_common(monkeypatch, grid_task, check, blob_cache)

    with pytest.raises(TaskRetryError):
        await grid_task.qc_hydrostatic_equil_grid_property_check_task_async(
            _FakeTaskTracker(), _make_sb_msg(_grid_msg()), _make_abort_signal()  # type: ignore[arg-type]
        )
