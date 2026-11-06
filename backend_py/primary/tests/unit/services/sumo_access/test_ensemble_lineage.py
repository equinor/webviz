from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from webviz_services.sumo_access import ensemble_lineage
from webviz_services.sumo_access.case_inspector import CaseInspector, EnsembleInfo
from webviz_services.sumo_access.ensemble_lineage import (
    MAX_RESTART_CHAIN_DEPTH,
    RestartAncestor,
    get_restart_chain_async,
    get_restart_from_uuid_async,
    resolve_ensemble_by_uuid_async,
)


class _FakeSumo:
    """In-memory stand-in for the Sumo index, used to build SearchContext mocks."""

    def __init__(self) -> None:
        # (case_uuid, ensemble_name) -> fmu.ensemble metadata on realization documents
        self.realization_ensemble_meta: dict[tuple[str, str], dict[str, Any]] = {}
        # ensemble_uuid -> (case_uuid, case_name, ensemble_name)
        self.ensembles: dict[str, tuple[str, str, str]] = {}

    def add_ensemble(
        self, ens_uuid: str, case_uuid: str, case_name: str, ensemble_name: str, restart_from: str | None = None
    ) -> None:
        meta: dict[str, Any] = {"name": ensemble_name, "uuid": ens_uuid}
        if restart_from is not None:
            meta["restart_from"] = restart_from
        self.realization_ensemble_meta[(case_uuid, ensemble_name)] = meta
        self.ensembles[ens_uuid] = (case_uuid, case_name, ensemble_name)

    def search_context_factory(self, sumo: Any) -> MagicMock:  # pylint: disable=unused-argument
        root = MagicMock()

        def _filter(*, uuid: str, ensemble: str, realization: bool) -> MagicMock:
            assert realization is True
            meta = self.realization_ensemble_meta.get((uuid, ensemble))
            limited = MagicMock()
            limited.length_async = AsyncMock(return_value=0 if meta is None else 1)
            doc = MagicMock()
            doc.metadata = {"fmu": {"ensemble": meta}}
            limited.getitem_async = AsyncMock(return_value=doc)

            filtered = MagicMock()
            filtered.limit = MagicMock(return_value=limited)
            return filtered

        async def _get_ensemble_by_uuid_async(ens_uuid: str) -> MagicMock:
            if ens_uuid not in self.ensembles:
                request = httpx.Request("GET", f"https://sumo/objects('{ens_uuid}')")
                response = httpx.Response(404, request=request)
                raise httpx.HTTPStatusError("not found", request=request, response=response)
            case_uuid, case_name, ensemble_name = self.ensembles[ens_uuid]
            ens = MagicMock()
            ens.caseuuid = case_uuid
            ens.casename = case_name
            ens.name = ensemble_name
            return ens

        root.filter = MagicMock(side_effect=_filter)
        root.get_ensemble_by_uuid_async = AsyncMock(side_effect=_get_ensemble_by_uuid_async)
        return root


@pytest.fixture(name="fake_sumo")
def fixture_fake_sumo() -> Any:
    fake = _FakeSumo()
    with patch.object(ensemble_lineage, "SearchContext", side_effect=fake.search_context_factory):
        yield fake


async def test_get_restart_from_uuid_returns_none_without_restart_from(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred")
    assert await get_restart_from_uuid_async(MagicMock(), "case-a", "pred") is None


async def test_get_restart_from_uuid_returns_none_when_no_documents(
    fake_sumo: _FakeSumo,
) -> None:  # pylint: disable=unused-argument
    assert await get_restart_from_uuid_async(MagicMock(), "case-a", "missing") is None


async def test_resolve_ensemble_by_uuid_returns_none_on_miss(
    fake_sumo: _FakeSumo,
) -> None:  # pylint: disable=unused-argument
    assert await resolve_ensemble_by_uuid_async(MagicMock(), "unknown") is None


async def test_resolve_ensemble_by_uuid_reraises_other_http_errors() -> None:
    request = httpx.Request("GET", "https://sumo")
    error = httpx.HTTPStatusError("boom", request=request, response=httpx.Response(500, request=request))
    search_context = MagicMock()
    search_context.get_ensemble_by_uuid_async = AsyncMock(side_effect=error)
    with patch.object(ensemble_lineage, "SearchContext", return_value=search_context):
        with pytest.raises(httpx.HTTPStatusError):
            await resolve_ensemble_by_uuid_async(MagicMock(), "some-uuid")


async def test_chain_empty_without_restart_from(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "pred")

    assert chain.ancestors == []
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_one_level(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-iter3", "case-b", "Case B", "iter-3")
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "pred")

    assert chain.ancestors == [RestartAncestor("uuid-iter3", "case-b", "Case B", "iter-3")]
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_two_levels_nearest_first(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-iter2", "case-a", "Case A", "iter-2")
    fake_sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3", restart_from="uuid-iter2")
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "pred")

    assert [anc.ensemble_name for anc in chain.ancestors] == ["iter-3", "iter-2"]
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is False


async def test_chain_unresolved_keeps_ancestors_before_it(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3", restart_from="uuid-deleted")
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "pred")

    assert [anc.ensemble_name for anc in chain.ancestors] == ["iter-3"]
    assert chain.unresolved_ensemble_uuid == "uuid-deleted"
    assert chain.truncated is False


async def test_chain_cycle_back_to_start_is_truncated(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-a", "case-a", "Case A", "ens-a", restart_from="uuid-b")
    fake_sumo.add_ensemble("uuid-b", "case-a", "Case A", "ens-b", restart_from="uuid-a")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "ens-a")

    assert [anc.ensemble_name for anc in chain.ancestors] == ["ens-b"]
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is True


async def test_chain_self_restart_is_truncated(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-a", "case-a", "Case A", "ens-a", restart_from="uuid-a")

    chain = await get_restart_chain_async(MagicMock(), "case-a", "ens-a")

    assert chain.ancestors == []
    assert chain.truncated is True


async def test_chain_depth_cap_is_truncated(fake_sumo: _FakeSumo) -> None:
    chain_length = MAX_RESTART_CHAIN_DEPTH + 3
    for i in range(chain_length):
        restart_from = f"uuid-{i + 1}" if i + 1 < chain_length else None
        fake_sumo.add_ensemble(f"uuid-{i}", "case-a", "Case A", f"ens-{i}", restart_from=restart_from)

    chain = await get_restart_chain_async(MagicMock(), "case-a", "ens-0")

    assert len(chain.ancestors) == MAX_RESTART_CHAIN_DEPTH
    assert chain.ancestors[0].ensemble_name == "ens-1"
    assert chain.unresolved_ensemble_uuid is None
    assert chain.truncated is True


async def test_chain_exactly_at_depth_cap_is_not_truncated(fake_sumo: _FakeSumo) -> None:
    chain_length = MAX_RESTART_CHAIN_DEPTH + 1
    for i in range(chain_length):
        restart_from = f"uuid-{i + 1}" if i + 1 < chain_length else None
        fake_sumo.add_ensemble(f"uuid-{i}", "case-a", "Case A", f"ens-{i}", restart_from=restart_from)

    chain = await get_restart_chain_async(MagicMock(), "case-a", "ens-0")

    assert len(chain.ancestors) == MAX_RESTART_CHAIN_DEPTH
    assert chain.truncated is False


async def test_case_inspector_ensemble_restart_infos_gives_direct_parent_only(fake_sumo: _FakeSumo) -> None:
    fake_sumo.add_ensemble("uuid-iter2", "case-a", "Case A", "iter-2")
    fake_sumo.add_ensemble("uuid-iter3", "case-a", "Case A", "iter-3", restart_from="uuid-iter2")
    fake_sumo.add_ensemble("uuid-pred", "case-a", "Case A", "pred", restart_from="uuid-iter3")
    fake_sumo.add_ensemble("uuid-pred2", "case-a", "Case A", "pred2", restart_from="uuid-deleted")
    ensembles = [EnsembleInfo(name=name, realization_count=1) for name in ["iter-2", "iter-3", "pred", "pred2"]]

    inspector = CaseInspector(sumo_client=MagicMock(), case_uuid="case-a")
    with patch.object(CaseInspector, "get_ensembles_async", AsyncMock(return_value=ensembles)):
        infos = await inspector.get_ensemble_restart_infos_async()

    infos_by_name = {info.ensemble_name: info for info in infos}
    assert infos_by_name["iter-2"].restart_from is None
    assert infos_by_name["iter-2"].restart_from_unresolved_uuid is None
    assert infos_by_name["iter-3"].restart_from == RestartAncestor("uuid-iter2", "case-a", "Case A", "iter-2")
    assert infos_by_name["pred"].restart_from == RestartAncestor("uuid-iter3", "case-a", "Case A", "iter-3")
    assert infos_by_name["pred2"].restart_from is None
    assert infos_by_name["pred2"].restart_from_unresolved_uuid == "uuid-deleted"
