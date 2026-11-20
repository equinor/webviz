from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from webviz_services.service_exceptions import NoDataError, Service
from webviz_services.sumo_access import ensemble_lineage
from webviz_services.sumo_access.ensemble_lineage import (
    MAX_RESTART_CHAIN_DEPTH,
    ResolvedEnsemble,
    get_case_ensemble_restart_infos_async,
    get_restart_chain_async,
    resolve_ensemble_by_uuid_async,
)


def _term_value(filters: list[dict[str, Any]], field: str) -> str | None:
    return next((f["term"][field] for f in filters if "term" in f and field in f["term"]), None)


class _FakeSumoClient:
    """Stand-in for SumoClient.post_async("/search") serving realization-level documents of known ensembles."""

    def __init__(self) -> None:
        # ensemble_uuid -> (case_uuid, case_name, ensemble_name, restart_from)
        self.ensembles: dict[str, tuple[str, str, str, str | None]] = {}
        self.payloads: list[dict[str, Any]] = []

    def add_ensemble(
        self, ens_uuid: str, case_uuid: str, case_name: str, ensemble_name: str, restart_from: str | None = None
    ) -> None:
        self.ensembles[ens_uuid] = (case_uuid, case_name, ensemble_name, restart_from)

    def _source(self, ens_uuid: str) -> dict[str, Any]:
        case_uuid, case_name, ensemble_name, restart_from = self.ensembles[ens_uuid]
        ensemble: dict[str, Any] = {"uuid": ens_uuid, "name": ensemble_name}
        if restart_from is not None:
            ensemble["restart_from"] = restart_from
        return {"fmu": {"case": {"uuid": case_uuid, "name": case_name}, "ensemble": ensemble}}

    async def post_async(self, path: str, json: dict[str, Any]) -> MagicMock:
        assert path == "/search"
        self.payloads.append(json)
        query = json["query"]["bool"]
        assert {"exists": {"field": "fmu.realization.id"}} in query["filter"]
        assert query["must_not"] == [{"term": {"_sumo.hidden": True}}]

        filters = query["filter"]
        case_uuid = _term_value(filters, "fmu.case.uuid.keyword")
        ensemble_name = _term_value(filters, "fmu.ensemble.name.keyword")
        ensemble_uuid = _term_value(filters, "fmu.ensemble.uuid.keyword")
        matching = [
            uuid
            for uuid, (c_uuid, _, name, _) in self.ensembles.items()
            if (case_uuid is None or c_uuid == case_uuid)
            and (ensemble_name is None or name == ensemble_name)
            and (ensemble_uuid is None or uuid == ensemble_uuid)
        ]

        response = MagicMock()
        if "aggs" in json:
            buckets = [
                {"key": self.ensembles[uuid][2], "doc": {"hits": {"hits": [{"_source": self._source(uuid)}]}}}
                for uuid in matching
            ]
            response.json.return_value = {"aggregations": {"ensembles": {"buckets": buckets}}}
        else:
            assert json["size"] == 1
            assert "fmu.ensemble.restart_from" in json["_source"]
            response.json.return_value = {"hits": {"hits": [{"_source": self._source(uuid)} for uuid in matching[:1]]}}
        return response

    def count_uuid_lookups(self, ensemble_uuid: str) -> int:
        return sum(
            1
            for payload in self.payloads
            if _term_value(payload["query"]["bool"]["filter"], "fmu.ensemble.uuid.keyword") == ensemble_uuid
        )


@pytest.fixture(name="sumo")
def fixture_sumo() -> _FakeSumoClient:
    return _FakeSumoClient()


async def test_resolve_ensemble_by_uuid(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-iter3", "case-b", "Case B", "iter-3")

    assert await resolve_ensemble_by_uuid_async(sumo, "uuid-iter3") == ResolvedEnsemble(  # type: ignore[arg-type]
        "uuid-iter3", "case-b", "Case B", "iter-3"
    )
    assert await resolve_ensemble_by_uuid_async(sumo, "unknown") is None  # type: ignore[arg-type]


async def test_chain_empty_for_unknown_ensemble(sumo: _FakeSumoClient) -> None:
    chain = await get_restart_chain_async(sumo, "case-a", "missing")  # type: ignore[arg-type]

    assert chain.ensemble is None
    assert chain.ancestors == []
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_empty_without_restart_from(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred")

    chain = await get_restart_chain_async(sumo, "case-a", "pred")  # type: ignore[arg-type]

    assert chain.ancestors == []
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_one_level_uses_one_search_per_ensemble(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-iter3", "case-b", "Case B", "iter-3")
    sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(sumo, "case-a", "pred")  # type: ignore[arg-type]

    assert chain.ancestors == [ResolvedEnsemble("uuid-iter3", "case-b", "Case B", "iter-3")]
    assert chain.ancestors[0].label == "Case B/iter-3"
    assert chain.ensemble == ResolvedEnsemble("uuid-pred", "case-a", "Case A", "pred")
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False
    assert len(sumo.payloads) == 2


async def test_chain_two_levels_nearest_first(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-iter2", "case-a", "Case A", "iter-2")
    sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3", restart_from="uuid-iter2")
    sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(sumo, "case-a", "pred")  # type: ignore[arg-type]

    assert [anc.ensemble_name for anc in chain.ancestors] == ["iter-3", "iter-2"]
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_unresolved_keeps_ancestors_before_it(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3", restart_from="uuid-deleted")
    sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(sumo, "case-a", "pred")  # type: ignore[arg-type]

    assert [anc.ensemble_name for anc in chain.ancestors] == ["iter-3"]
    assert chain.unresolved_ensemble_uuid == "uuid-deleted"
    assert chain.truncated is False


async def test_chain_cycle_back_to_start_is_truncated(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-a", "case-a", "Case A", "ens-a", restart_from="uuid-b")
    sumo.add_ensemble("uuid-b", "case-a", "Case A", "ens-b", restart_from="uuid-a")

    chain = await get_restart_chain_async(sumo, "case-a", "ens-a")  # type: ignore[arg-type]

    assert [anc.ensemble_name for anc in chain.ancestors] == ["ens-b"]
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is True


async def test_chain_self_restart_is_truncated(sumo: _FakeSumoClient) -> None:
    sumo.add_ensemble("uuid-a", "case-a", "Case A", "ens-a", restart_from="uuid-a")

    chain = await get_restart_chain_async(sumo, "case-a", "ens-a")  # type: ignore[arg-type]

    assert chain.ancestors == []
    assert chain.truncated is True


async def test_chain_depth_cap_is_truncated(sumo: _FakeSumoClient) -> None:
    chain_length = MAX_RESTART_CHAIN_DEPTH + 3
    for i in range(chain_length):
        restart_from = f"uuid-{i + 1}" if i + 1 < chain_length else None
        sumo.add_ensemble(f"uuid-{i}", "case-a", "Case A", f"ens-{i}", restart_from=restart_from)

    chain = await get_restart_chain_async(sumo, "case-a", "ens-0")  # type: ignore[arg-type]

    assert len(chain.ancestors) == MAX_RESTART_CHAIN_DEPTH
    assert chain.ancestors[0].ensemble_name == "ens-1"
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is True


async def test_chain_exactly_at_depth_cap_is_not_truncated(sumo: _FakeSumoClient) -> None:
    chain_length = MAX_RESTART_CHAIN_DEPTH + 1
    for i in range(chain_length):
        restart_from = f"uuid-{i + 1}" if i + 1 < chain_length else None
        sumo.add_ensemble(f"uuid-{i}", "case-a", "Case A", f"ens-{i}", restart_from=restart_from)

    chain = await get_restart_chain_async(sumo, "case-a", "ens-0")  # type: ignore[arg-type]

    assert len(chain.ancestors) == MAX_RESTART_CHAIN_DEPTH
    assert chain.truncated is False


async def test_case_restart_infos_give_direct_parent_sorted_and_resolve_shared_parent_once(
    sumo: _FakeSumoClient,
) -> None:
    sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3")
    sumo.add_ensemble("uuid-pred2", "case-a", "Case A", "pred2", restart_from="uuid-iter3")
    sumo.add_ensemble("uuid-pred1", "case-a", "Case A", "pred1", restart_from="uuid-iter3")
    sumo.add_ensemble("uuid-pred3", "case-a", "Case A", "pred3", restart_from="uuid-deleted")
    sumo.add_ensemble("uuid-other", "case-b", "Case B", "other")

    with patch.object(ensemble_lineage, "create_sumo_case_async", AsyncMock()):
        infos = await get_case_ensemble_restart_infos_async(sumo, "case-a")  # type: ignore[arg-type]

    iter3 = ResolvedEnsemble("uuid-iter3", "case-a", "Case A", "iter-3")
    assert [(info.ensemble_name, info.restart_from, info.restart_from_unresolved_uuid) for info in infos] == [
        ("iter-3", None, None),
        ("pred1", iter3, None),
        ("pred2", iter3, None),
        ("pred3", None, "uuid-deleted"),
    ]
    assert sumo.count_uuid_lookups("uuid-iter3") == 1


async def test_case_restart_infos_reraise_missing_case_unwrapped(sumo: _FakeSumoClient) -> None:
    missing_case = AsyncMock(side_effect=NoDataError("Sumo case not found", Service.SUMO))
    with patch.object(ensemble_lineage, "create_sumo_case_async", missing_case):
        with pytest.raises(NoDataError):
            await get_case_ensemble_restart_infos_async(sumo, "case-x")  # type: ignore[arg-type]
