import sys
import time
import types
from typing import Any

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient

# primary.config reads required env vars and calls out to Sumo's well-known endpoint on import, so stub it.
if "primary.config" not in sys.modules:
    _config_stub = types.ModuleType("primary.config")
    _config_stub.GRAPH_SCOPES = []  # type: ignore[attr-defined]
    _config_stub.RESOURCE_SCOPES_DICT = {}  # type: ignore[attr-defined]
    _config_stub.SERVICE_BUS_PAYLOAD_FERNET_KEY = ""  # type: ignore[attr-defined]
    _config_stub.SERVICE_BUS_DEFAULT_QUEUE = "test-queue"  # type: ignore[attr-defined]
    sys.modules["primary.config"] = _config_stub

# pylint: disable=wrong-import-position
from webviz_server_schemas.pyworker.messages import QcHydrostaticEquilVectorCheckMsg, WorkerOperation
from webviz_services.operations.hydrostatic_equilibrium_check import hydrostatic_equilibrium_types as he_types
from webviz_services.utils.task_meta_tracker import TaskMeta, TaskState

from primary.auth.auth_helper import AuthHelper
from primary.routers.qc import router as qc_router_module
from primary.routers.qc import task_helpers

VECTOR_CHECK_URL = "/qc/hydrostatic_equilibrium_vector_check_hybrid"
GRID_CHECK_URL = "/qc/hydrostatic_equilibrium_grid_property_check_hybrid"
VECTOR_CHECK_PARAMS: dict[str, Any] = {
    "case_uuid": "case-1",
    "ensemble_name": "iter-0",
    "t0_iso": "2020-01-01T00:00:00",
    "t1_iso": "2021-01-01T00:00:00",
}
GRID_CHECK_PARAMS: dict[str, Any] = {
    "case_uuid": "case-1",
    "ensemble_name": "iter-0",
    "grid_name": "Geogrid",
    "realization": 3,
}


class _FakeUser:
    def get_user_id(self) -> str:
        return "user-1"

    def get_sumo_access_token(self) -> str:
        return "sumo-token"


class _FakeFingerprinter:
    async def get_or_calc_ensemble_fp_async(self, case_uuid: str, ensemble_name: str) -> str:
        return f"fp-{case_uuid}-{ensemble_name}"


class _FakeBlobCache:
    def __init__(self, stored: he_types.HydrostaticVectorCheckResult | None) -> None:
        self._stored = stored

    def compute_cache_key(self, key: str) -> str:
        return f"cache::{key}"

    async def has_cache_entry_async(self, _cache_key: str) -> bool:
        return self._stored is not None

    async def get_pydantic_model_async(self, _cache_key: str, _model_class: type) -> Any:
        return self._stored


class _FakeTaskTracker:
    def __init__(self, existing_task: TaskMeta | None = None) -> None:
        self.existing_task = existing_task
        self.registered: list[dict[str, Any]] = []
        self.deleted_fingerprints: list[str] = []
        self.deleted_mappings: list[str] = []

    def generate_task_id(self, prefix: str) -> str:
        return f"{prefix}-task-1"

    async def delete_task_by_fingerprint_async(self, fingerprint: str) -> bool:
        self.deleted_fingerprints.append(fingerprint)
        return True

    async def delete_fingerprint_to_task_mapping_async(self, fingerprint: str) -> None:
        self.deleted_mappings.append(fingerprint)

    async def get_task_meta_by_fingerprint_async(self, _fingerprint: str) -> TaskMeta | None:
        return self.existing_task

    async def register_task_with_fingerprint_async(
        self, task_id: str, fingerprint: str, ttl_s: int, expected_store_key: str
    ) -> TaskMeta:
        self.registered.append(
            {"task_id": task_id, "fingerprint": fingerprint, "expected_store_key": expected_store_key}
        )
        return _make_task_meta(task_id, TaskState.PENDING)


class _FakeMessageBus:
    def __init__(self) -> None:
        self.sent: list[Any] = []

    async def send_to_queue_async(self, queue_name: str, message: Any) -> None:
        self.sent.append((queue_name, message))


def _make_task_meta(task_id: str, state: TaskState, status_message: str | None = None) -> TaskMeta:
    now = time.time()
    return TaskMeta(
        task_id=task_id,
        state=state,
        status_message=status_message,
        internal_error_message=None,
        expected_store_key="cache::key",
        registered_at_utc_s=now,
        updated_at_utc_s=now,
        started_at_utc_s=None,
        completed_at_utc_s=None,
    )


def _make_vector_result() -> he_types.HydrostaticVectorCheckResult:
    return he_types.HydrostaticVectorCheckResult(
        time_steps=he_types.TimeStepPair(
            t0_iso="2020-01-01T00:00:00", t1_iso="2021-01-01T00:00:00", time_gap_days=366.0, time_gap_ok=True
        ),
        checked_vector_names=["FOPT"],
        realization_results=[
            he_types.RealizationVectorCheckResult(
                realization=0,
                vector_values=[he_types.VectorCheckValue(vector_name="FOPT", value_at_t1=0.0, is_zero=True)],
            )
        ],
        source_object_uuids=["uuid-1", "uuid-2"],
    )


@pytest.fixture(name="message_bus")
def fixture_message_bus(monkeypatch: pytest.MonkeyPatch) -> _FakeMessageBus:
    bus = _FakeMessageBus()
    monkeypatch.setattr(task_helpers.MessageBusSingleton, "get_instance", lambda: bus)
    monkeypatch.setattr(task_helpers.config, "SERVICE_BUS_PAYLOAD_FERNET_KEY", Fernet.generate_key().decode())
    return bus


def _install_fakes(monkeypatch: pytest.MonkeyPatch, tracker: _FakeTaskTracker, blob_cache: _FakeBlobCache) -> None:
    monkeypatch.setattr(task_helpers, "get_task_meta_tracker_for_user_id", lambda _user_id: tracker)
    monkeypatch.setattr(task_helpers, "get_sumo_blob_cache_from_access_token", lambda _token, _op: blob_cache)
    monkeypatch.setattr(task_helpers, "get_sumo_fingerprinter_for_user", lambda **_kwargs: _FakeFingerprinter())


@pytest.fixture(name="client")
def fixture_client() -> TestClient:
    app = FastAPI()
    app.include_router(qc_router_module.router, prefix="/qc")
    app.dependency_overrides[AuthHelper.get_authenticated_user] = lambda: _FakeUser()
    return TestClient(app)


def test_cache_hit_returns_success_without_source_object_uuids(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, message_bus: _FakeMessageBus
) -> None:
    tracker = _FakeTaskTracker()
    _install_fakes(monkeypatch, tracker, _FakeBlobCache(_make_vector_result()))

    resp = client.get(VECTOR_CHECK_URL, params=VECTOR_CHECK_PARAMS)

    assert resp.status_code == 200
    body = resp.json()
    assert body["response_type"] == "LroSuccessResp"
    assert body["result"]["checked_vector_names"] == ["FOPT"]
    assert "source_object_uuids" not in body["result"]
    assert "source_object_uuids" not in body["result"]["realization_results"][0]
    assert not message_bus.sent
    assert len(tracker.deleted_mappings) == 1


def test_no_task_enqueues_and_returns_202(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, message_bus: _FakeMessageBus
) -> None:
    tracker = _FakeTaskTracker()
    _install_fakes(monkeypatch, tracker, _FakeBlobCache(None))

    resp = client.get(VECTOR_CHECK_URL, params={**VECTOR_CHECK_PARAMS, "realizations": [2, 1]})

    assert resp.status_code == 202
    body = resp.json()
    assert body["response_type"] == "LroInProgressResp"
    assert body["task_id"] == "qc-task-1"

    assert len(tracker.registered) == 1
    assert tracker.registered[0]["expected_store_key"].startswith("cache::taskFP__qcVecCheck__")

    assert len(message_bus.sent) == 1
    _queue_name, sb_msg = message_bus.sent[0]
    assert str(sb_msg.subject) == WorkerOperation.QC_HYDROSTATIC_EQUIL_VECTOR_CHECK
    msg = QcHydrostaticEquilVectorCheckMsg.model_validate_json(b"".join(sb_msg.body))
    assert msg.realizations == [2, 1]
    assert msg.t0_iso == VECTOR_CHECK_PARAMS["t0_iso"]


def test_failed_task_returns_500_failure_resp(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, message_bus: _FakeMessageBus
) -> None:
    failed_task = _make_task_meta("qc-task-9", TaskState.FAILED, status_message="No data")
    tracker = _FakeTaskTracker(existing_task=failed_task)
    _install_fakes(monkeypatch, tracker, _FakeBlobCache(None))

    resp = client.get(GRID_CHECK_URL, params=GRID_CHECK_PARAMS)

    assert resp.status_code == 500
    body = resp.json()
    assert body["response_type"] == "LroFailureResp"
    assert body["task_id"] == "qc-task-9"
    assert "No data" in body["error_message"]
    assert not message_bus.sent


def test_retry_task_deletes_task_and_returns_command_resp(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, message_bus: _FakeMessageBus
) -> None:
    tracker = _FakeTaskTracker()
    _install_fakes(monkeypatch, tracker, _FakeBlobCache(None))

    resp = client.get(GRID_CHECK_URL, params={**GRID_CHECK_PARAMS, "retry_task": True})

    assert resp.status_code == 200
    assert resp.json() == {"response_type": "LroCommandResp", "command_ok": True, "message": None}
    assert len(tracker.deleted_fingerprints) == 1
    assert tracker.deleted_fingerprints[0].startswith("taskFP__qcGridPropCheck__")
    assert not message_bus.sent
