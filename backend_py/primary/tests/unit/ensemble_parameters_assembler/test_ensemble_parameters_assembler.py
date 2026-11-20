from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pyarrow as pa
import pytest

from webviz_services.ensemble_parameters_assembler import ensemble_parameters_assembler
from webviz_services.ensemble_parameters_assembler.ensemble_parameters_assembler import EnsembleParametersAssembler
from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError
from webviz_services.sumo_access import parameter_access
from webviz_services.sumo_access.ensemble_lineage import ResolvedEnsemble, RestartChain
from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.sumo_access.parameter_types import (
    EnsembleParameter,
    ParametersAndSensitivities,
    ParameterSourceEnsemble,
)

CHILD = ResolvedEnsemble(ensemble_uuid="uuid-pred", case_uuid="case-a", case_name="Case A", ensemble_name="pred")
PARENT = ResolvedEnsemble(ensemble_uuid="uuid-iter3", case_uuid="case-b", case_name="Case B", ensemble_name="iter-3")


def _param(name: str, values: list[Any]) -> EnsembleParameter:
    return EnsembleParameter(
        name=name,
        is_logarithmic=False,
        is_discrete=False,
        is_constant=len(set(values)) == 1,
        is_numerical=not isinstance(values[0], str),
        realizations=list(range(len(values))),
        values=values,
    )


def _source(ancestor: ResolvedEnsemble) -> ParameterSourceEnsemble:
    return ParameterSourceEnsemble(
        case_uuid=ancestor.case_uuid, case_name=ancestor.case_name, ensemble_name=ancestor.ensemble_name
    )


def _param_table(columns: dict[str, tuple[list[Any], str | None]], realizations: list[int]) -> pa.Table:
    fields = [pa.field("REAL", pa.int64())]
    arrays = [pa.array(realizations, pa.int64())]
    for name, (values, group) in columns.items():
        is_string = isinstance(values[0], str)
        metadata = {"distribution": "raw" if is_string else "uniform"}
        if group is not None:
            metadata["group"] = group
        data_type = pa.string() if is_string else pa.float64()
        fields.append(pa.field(name, data_type, metadata=metadata))
        arrays.append(pa.array(values, data_type))
    return pa.Table.from_arrays(arrays, schema=pa.schema(fields))


class _FakeSearchContext:
    """Minimal stand-in for fmu.sumo SearchContext; serves standard-result parameter tables by (case, ensemble)."""

    def __init__(self, tables: dict[tuple[str, str], list[pa.Table]], filters: dict[str, Any] | None = None) -> None:
        self._tables = tables
        self._filters = filters or {}

    def filter(self, **kwargs: Any) -> "_FakeSearchContext":
        return _FakeSearchContext(self._tables, {**self._filters, **kwargs})

    def _matching_tables(self) -> list[pa.Table]:
        assert "standard_result" in self._filters
        return self._tables.get((self._filters["uuid"], self._filters["ensemble"]), [])

    async def length_async(self) -> int:
        return len(self._matching_tables())

    async def getitem_async(self, index: int) -> MagicMock:
        table_obj = MagicMock()
        table_obj.to_arrow_async = AsyncMock(return_value=self._matching_tables()[index])
        return table_obj


CHILD_TABLE = _param_table(
    {
        "SENSNAME": (["s1", "s1", "s2"], None),
        "SENSCASE": (["c1", "c1", "c2"], None),
        "FWL": ([1.0, 2.0, 3.0], "GLOBVAR"),
    },
    [0, 1, 2],
)
PARENT_TABLE = _param_table(
    {
        "SENSNAME": (["s1", "s1", "s2", "s3"], None),
        "SENSCASE": (["c1", "c1", "c2", "c3"], None),
        "KVKH": ([5.0, 6.0, 7.0, 8.0], "GLOBVAR"),
    },
    [0, 1, 2, 3],
)


class _AssemblerHarness:
    def __init__(self, tables: dict[tuple[str, str], list[pa.Table]], chain: RestartChain) -> None:
        self.tables = tables
        self.chain = chain
        self.legacy_parameters: list[EnsembleParameter] = []
        self.detect_warning: str | None = None

    async def run_async(self) -> ParametersAndSensitivities:
        def _search_context_factory(sumo: Any) -> _FakeSearchContext:  # pylint: disable=unused-argument
            return _FakeSearchContext(self.tables)

        with (
            patch.object(parameter_access, "SearchContext", side_effect=_search_context_factory),
            patch.object(ensemble_parameters_assembler, "get_restart_chain_async", AsyncMock(return_value=self.chain)),
            patch.object(
                ParameterAccess, "get_legacy_parameters_async", AsyncMock(return_value=self.legacy_parameters)
            ),
            patch.object(
                ParameterAccess,
                "detect_parameters_missing_from_standard_result_async",
                AsyncMock(return_value=self.detect_warning),
            ),
        ):
            assembler = EnsembleParametersAssembler(sumo_client=MagicMock(), case_uuid="case-a", ensemble_name="pred")
            return await assembler.get_parameters_and_sensitivities_async()


_NO_RESTART = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid=None, truncated=False)


async def test_assembler_without_restart_returns_own_parameters_and_no_warnings_async() -> None:
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE]}, _NO_RESTART)

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert not result.warnings


async def test_assembler_merges_parent_and_takes_sensitivities_from_child_only_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run_async()

    assert [(p.name, p.source_ensemble) for p in result.parameters] == [
        ("SENSNAME", None),
        ("SENSCASE", None),
        ("FWL", None),
        ("KVKH", _source(PARENT)),
    ]
    assert result.parameters[3].realizations == [0, 1, 2]
    sens_case_names = {case.name for sens in result.sensitivities for case in sens.cases}
    assert sens_case_names == {"c1", "c2"}
    all_sens_realizations = {real for sens in result.sensitivities for case in sens.cases for real in case.realizations}
    assert all_sens_realizations == {0, 1, 2}
    assert not result.warnings


async def test_assembler_warns_for_unresolved_ancestor_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert len(result.warnings) == 1
    assert "uuid-deleted" in result.warnings[0]
    assert "could not be found" in result.warnings[0]


async def test_assembler_warns_for_unresolved_grandparent_and_keeps_parent_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run_async()

    assert result.parameters[-1].name == "KVKH"
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "uuid-deleted" in result.warnings[0]


async def test_assembler_warns_for_truncated_chain_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=True)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run_async()

    assert len(result.warnings) == 1
    assert "cycle" in result.warnings[0]


async def test_assembler_warns_and_skips_ancestor_without_standard_result_table_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "no standard-result parameters" in result.warnings[0]


async def test_assembler_raises_for_ancestor_with_multiple_standard_result_tables_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AssemblerHarness(
        {("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE, PARENT_TABLE]}, chain
    )

    with pytest.raises(MultipleDataMatchesError, match="Case B/iter-3"):
        await harness.run_async()


async def test_assembler_conflict_error_is_not_wrapped_in_exception_group_async() -> None:
    conflicting_parent_table = _param_table(
        {"SENSNAME": (["s1", "s1", "s2"], None), "SENSCASE": (["c1", "c1", "c2"], None), "FWL": ([1.0] * 3, "GLOBVAR")},
        [0, 1, 2],
    )
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AssemblerHarness(
        {("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [conflicting_parent_table]}, chain
    )

    with pytest.raises(InvalidDataError, match="GLOBVAR/FWL exist in both Case A/pred and Case B/iter-3"):
        await harness.run_async()


async def test_assembler_legacy_child_with_ancestors_warns_and_does_not_merge_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AssemblerHarness({("case-b", "iter-3"): [PARENT_TABLE]}, chain)
    harness.legacy_parameters = [_param("LEGACY", [1.0, 2.0])]

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["LEGACY"]
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "not stored as a standard result" in result.warnings[0]


async def test_assembler_non_standard_parameters_warning_is_kept_in_warnings_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)
    harness.detect_warning = "missing from the ERT-managed parameter set"

    result = await harness.run_async()

    assert len(result.warnings) == 2
    assert result.warnings[-1] == "missing from the ERT-managed parameter set"


async def test_assembler_flags_unresolved_restart_ensemble_for_caching_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)

    assert (await harness.run_async()).has_unresolved_restart_ensemble is True
    harness.chain = _NO_RESTART
    assert (await harness.run_async()).has_unresolved_restart_ensemble is False


async def test_assembler_legacy_child_with_unresolved_parent_warns_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AssemblerHarness({}, chain)
    harness.legacy_parameters = [_param("LEGACY", [1.0, 2.0])]

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["LEGACY"]
    assert len(result.warnings) == 1
    assert "uuid-deleted" in result.warnings[0]
    assert "could not be found" in result.warnings[0]
    assert result.has_unresolved_restart_ensemble is False


async def test_assembler_legacy_child_with_self_restart_warns_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[], unresolved_ensemble_uuid=None, truncated=True)
    harness = _AssemblerHarness({}, chain)
    harness.legacy_parameters = [_param("LEGACY", [1.0, 2.0])]

    result = await harness.run_async()

    assert len(result.warnings) == 1
    assert "refers to the ensemble itself" in result.warnings[0]


async def test_assembler_legacy_child_with_truncated_chain_does_not_claim_combination_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=True)
    harness = _AssemblerHarness({("case-b", "iter-3"): [PARENT_TABLE]}, chain)
    harness.legacy_parameters = [_param("LEGACY", [1.0, 2.0])]

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["LEGACY"]
    assert len(result.warnings) == 1
    assert "were not combined" in result.warnings[0]


async def test_parameter_access_sensitivities_are_child_only_async() -> None:
    def _search_context_factory(sumo: Any) -> _FakeSearchContext:  # pylint: disable=unused-argument
        return _FakeSearchContext({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]})

    with patch.object(parameter_access, "SearchContext", side_effect=_search_context_factory):
        access = ParameterAccess(sumo_client=MagicMock(), case_uuid="case-a", ensemble_name="pred")
        sensitivities = await access.get_sensitivities_async()

    sens_case_names = {case.name for sens in sensitivities for case in sens.cases}
    assert sens_case_names == {"c1", "c2"}


async def test_assembler_warns_for_ancestor_table_without_parameter_columns_async() -> None:
    chain = RestartChain(ensemble=CHILD, ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    real_only_table = _param_table({}, [0, 1, 2])
    harness = _AssemblerHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [real_only_table]}, chain)

    result = await harness.run_async()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert len(result.warnings) == 1
    assert "no standard-result parameters" in result.warnings[0]
