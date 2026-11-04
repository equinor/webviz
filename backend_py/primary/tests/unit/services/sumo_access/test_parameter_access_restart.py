from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pyarrow as pa
import pytest

from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError
from webviz_services.sumo_access import parameter_access
from webviz_services.sumo_access.ensemble_lineage import RestartAncestor, RestartChain
from webviz_services.sumo_access.parameter_access import ParameterAccess, _merge_restart_parameters
from webviz_services.sumo_access.parameter_types import EnsembleParameter, ParameterSourceEnsemble

CHILD_LABEL = "Case A/pred"
PARENT = RestartAncestor(ensemble_uuid="uuid-iter3", case_uuid="case-b", case_name="Case B", ensemble_name="iter-3")
GRANDPARENT = RestartAncestor(
    ensemble_uuid="uuid-iter2", case_uuid="case-b", case_name="Case B", ensemble_name="iter-2"
)


def _param(
    name: str,
    values: list[Any],
    realizations: list[int] | None = None,
    group_name: str | None = None,
) -> EnsembleParameter:
    return EnsembleParameter(
        name=name,
        group_name=group_name,
        is_logarithmic=False,
        is_discrete=False,
        is_constant=len(set(values)) == 1,
        is_numerical=not isinstance(values[0], str),
        realizations=realizations if realizations is not None else list(range(len(values))),
        values=values,
        descriptive_name=name,
    )


def _source(ancestor: RestartAncestor) -> ParameterSourceEnsemble:
    return ParameterSourceEnsemble(
        case_uuid=ancestor.case_uuid, case_name=ancestor.case_name, ensemble_name=ancestor.ensemble_name
    )


# ---------------------------------------------------------------------------------------------------------------------
# _merge_restart_parameters
# ---------------------------------------------------------------------------------------------------------------------


def test_merge_without_ancestors_is_identity() -> None:
    own = [_param("A", [1.0, 2.0]), _param("B", [3.0, 4.0])]

    merged, warnings = _merge_restart_parameters(own, [], CHILD_LABEL)

    assert merged == own
    assert warnings == []


def test_merge_disjoint_names_sets_source_ensemble_and_keeps_own_first() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("FWL", [10.0, 20.0], group_name="GLOBVAR")]

    merged, warnings = _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["A", "FWL"]
    assert merged[0].source_ensemble is None
    assert merged[1].source_ensemble == _source(PARENT)
    assert merged[1].group_name == "GLOBVAR"
    assert merged[1].values == [10.0, 20.0]
    assert warnings == []


def test_merge_same_name_different_group_is_allowed() -> None:
    own = [_param("FWL", [1.0, 2.0], group_name="GROUP1")]
    parent_params = [_param("FWL", [10.0, 20.0], group_name="GROUP2")]

    merged, _ = _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [(p.name, p.group_name) for p in merged] == [("FWL", "GROUP1"), ("FWL", "GROUP2")]


def test_merge_same_name_and_group_raises_naming_ensembles_and_parameters() -> None:
    own = [_param("FWL", [1.0, 2.0], group_name="GLOBVAR"), _param("KVKH", [1.0, 2.0], group_name="GLOBVAR")]
    parent_params = [_param("FWL", [1.0, 2.0], group_name="GLOBVAR"), _param("KVKH", [1.0, 2.0], group_name="GLOBVAR")]

    with pytest.raises(InvalidDataError) as exc_info:
        _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    message = str(exc_info.value)
    assert "GLOBVAR/FWL" in message
    assert "GLOBVAR/KVKH" in message
    assert CHILD_LABEL in message
    assert "Case B/iter-3" in message


def test_merge_ungrouped_conflict_raises() -> None:
    own = [_param("MULT", [1.0, 2.0])]
    parent_params = [_param("MULT", [1.0, 2.0])]

    with pytest.raises(InvalidDataError, match="MULT"):
        _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_conflict_between_two_ancestors_raises() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("X", [1.0, 2.0])]
    grandparent_params = [_param("X", [1.0, 2.0])]

    with pytest.raises(InvalidDataError) as exc_info:
        _merge_restart_parameters(own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL)

    message = str(exc_info.value)
    assert "Case B/iter-3" in message
    assert "Case B/iter-2" in message
    assert CHILD_LABEL not in message


def test_merge_sensitivity_parameters_identical_are_kept_once_from_child() -> None:
    own = [
        _param("SENSNAME", ["rms_seed", "rms_seed"]),
        _param("SENSCASE", ["p10_p90", "p10_p90"]),
        _param("A", [1.0, 2.0]),
    ]
    parent_params = [
        _param("SENSNAME", ["rms_seed", "rms_seed"], group_name="DESIGN"),
        _param("SENSCASE", ["p10_p90", "p10_p90"], group_name="DESIGN"),
        _param("B", [3.0, 4.0]),
    ]

    merged, warnings = _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["SENSNAME", "SENSCASE", "A", "B"]
    assert all(p.source_ensemble is None for p in merged[:3])
    assert merged[3].source_ensemble == _source(PARENT)
    assert warnings == []


def test_merge_sensitivity_parameter_in_child_only_raises() -> None:
    own = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("B", [3.0, 4.0])]

    with pytest.raises(InvalidDataError, match=r"SENSCASE is missing in Case B/iter-3"):
        _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_sensitivity_parameters_in_parent_only_raises() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]

    with pytest.raises(InvalidDataError) as exc_info:
        _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    message = str(exc_info.value)
    assert f"SENSNAME is missing in {CHILD_LABEL}" in message
    assert f"SENSCASE is missing in {CHILD_LABEL}" in message


def test_merge_sensitivity_values_differing_on_one_realization_raises() -> None:
    own = [_param("SENSNAME", ["s1", "s1", "s2"]), _param("SENSCASE", ["c1", "c1", "c2"])]
    parent_params = [_param("SENSNAME", ["s1", "s1", "s1"]), _param("SENSCASE", ["c1", "c1", "c2"])]

    with pytest.raises(InvalidDataError, match=r"SENSNAME differs on 1 realization\(s\)"):
        _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_sensitivity_alignment_only_compares_child_realizations() -> None:
    own = [_param("SENSNAME", ["s1", "s1"], [0, 1]), _param("SENSCASE", ["c1", "c1"], [0, 1])]
    parent_params = [
        _param("SENSNAME", ["s1", "s1", "other"], [0, 1, 2]),
        _param("SENSCASE", ["c1", "c1", "other"], [0, 1, 2]),
    ]

    merged, warnings = _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["SENSNAME", "SENSCASE"]
    assert warnings == []


def test_merge_filters_ancestor_to_child_realizations_and_recomputes_is_constant() -> None:
    own = [_param("A", [1.0, 2.0], [1, 3])]
    parent_param = _param("B", [5.0, 7.0, 5.0, 9.0], [0, 1, 2, 3])
    parent_param_constant_after_filter = _param("C", [1.0, 2.0, 3.0, 2.0], [0, 1, 2, 3])
    assert parent_param_constant_after_filter.is_constant is False

    merged, warnings = _merge_restart_parameters(
        own, [(PARENT, [parent_param, parent_param_constant_after_filter])], CHILD_LABEL
    )

    merged_b = merged[1]
    assert merged_b.realizations == [1, 3]
    assert merged_b.values == [7.0, 9.0]
    assert merged_b.is_constant is False

    merged_c = merged[2]
    assert merged_c.realizations == [1, 3]
    assert merged_c.values == [2.0, 2.0]
    assert merged_c.is_constant is True
    assert warnings == []


def test_merge_child_realization_missing_in_parent_gives_warning() -> None:
    own = [_param("A", [1.0, 2.0, 3.0], [0, 1, 5])]
    parent_params = [_param("B", [10.0, 20.0], [0, 1])]

    merged, warnings = _merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert merged[1].realizations == [0, 1]
    assert len(warnings) == 1
    assert "Case B/iter-3" in warnings[0]
    assert "5" in warnings[0]


def test_merge_two_level_chain_orders_nearest_first() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("B", [3.0, 4.0])]
    grandparent_params = [_param("C", [5.0, 6.0]), _param("D", [7.0, 8.0])]

    merged, warnings = _merge_restart_parameters(
        own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL
    )

    assert [p.name for p in merged] == ["A", "B", "C", "D"]
    assert [p.source_ensemble for p in merged] == [None, _source(PARENT), _source(GRANDPARENT), _source(GRANDPARENT)]
    assert warnings == []


def test_merge_two_level_chain_checks_sensitivities_against_every_ancestor() -> None:
    own = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    grandparent_params = [_param("B", [3.0, 4.0])]

    with pytest.raises(InvalidDataError, match="Case B/iter-2"):
        _merge_restart_parameters(own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL)


# ---------------------------------------------------------------------------------------------------------------------
# ParameterAccess.get_parameters_and_sensitivities_async
# ---------------------------------------------------------------------------------------------------------------------


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


class _AccessHarness:
    def __init__(self, tables: dict[tuple[str, str], list[pa.Table]], chain: RestartChain) -> None:
        self.tables = tables
        self.chain = chain
        self.legacy_parameters: list[EnsembleParameter] = []
        self.detect_warning: str | None = None

    async def run(self) -> parameter_access.ParametersAndSensitivities:
        case_obj = MagicMock()
        case_obj.name = "Case A"

        def _search_context_factory(sumo: Any) -> _FakeSearchContext:  # pylint: disable=unused-argument
            return _FakeSearchContext(self.tables)

        with (
            patch.object(parameter_access, "SearchContext", side_effect=_search_context_factory),
            patch.object(parameter_access, "get_restart_chain_async", AsyncMock(return_value=self.chain)),
            patch.object(parameter_access, "create_sumo_case_async", AsyncMock(return_value=case_obj)),
            patch.object(
                ParameterAccess,
                "_get_parameters_from_legacy_result_async",
                AsyncMock(return_value=self.legacy_parameters),
            ),
            patch.object(
                ParameterAccess,
                "_detect_parameters_missing_from_standard_result_async",
                AsyncMock(return_value=self.detect_warning),
            ),
        ):
            access = ParameterAccess(sumo_client=MagicMock(), case_uuid="case-a", ensemble_name="pred")
            return await access.get_parameters_and_sensitivities_async()


_NO_RESTART = RestartChain(ancestors=[], unresolved_ensemble_uuid=None, truncated=False)


async def test_access_without_restart_returns_own_parameters_and_no_warnings() -> None:
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE]}, _NO_RESTART)

    result = await harness.run()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert result.warnings == []


async def test_access_merges_parent_and_takes_sensitivities_from_child_only() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run()

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
    assert result.warnings == []


async def test_access_warns_for_unresolved_ancestor() -> None:
    chain = RestartChain(ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)

    result = await harness.run()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert len(result.warnings) == 1
    assert "uuid-deleted" in result.warnings[0]
    assert "could not be found" in result.warnings[0]


async def test_access_warns_for_unresolved_grandparent_and_keeps_parent() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run()

    assert result.parameters[-1].name == "KVKH"
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "uuid-deleted" in result.warnings[0]


async def test_access_warns_for_truncated_chain() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=True)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE]}, chain)

    result = await harness.run()

    assert len(result.warnings) == 1
    assert "cycle" in result.warnings[0]


async def test_access_warns_and_skips_ancestor_without_standard_result_table() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)

    result = await harness.run()

    assert [p.name for p in result.parameters] == ["SENSNAME", "SENSCASE", "FWL"]
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "no standard-result parameters" in result.warnings[0]


async def test_access_raises_for_ancestor_with_multiple_standard_result_tables() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AccessHarness(
        {("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [PARENT_TABLE, PARENT_TABLE]}, chain
    )

    with pytest.raises(MultipleDataMatchesError, match="Case B/iter-3"):
        await harness.run()


async def test_access_conflict_error_is_not_wrapped_in_exception_group() -> None:
    conflicting_parent_table = _param_table(
        {"SENSNAME": (["s1", "s1", "s2"], None), "SENSCASE": (["c1", "c1", "c2"], None), "FWL": ([1.0] * 3, "GLOBVAR")},
        [0, 1, 2],
    )
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AccessHarness(
        {("case-a", "pred"): [CHILD_TABLE], ("case-b", "iter-3"): [conflicting_parent_table]}, chain
    )

    with pytest.raises(InvalidDataError, match="GLOBVAR/FWL exist in both Case A/pred and Case B/iter-3"):
        await harness.run()


async def test_access_legacy_child_with_ancestors_warns_and_does_not_merge() -> None:
    chain = RestartChain(ancestors=[PARENT], unresolved_ensemble_uuid=None, truncated=False)
    harness = _AccessHarness({("case-b", "iter-3"): [PARENT_TABLE]}, chain)
    harness.legacy_parameters = [_param("LEGACY", [1.0, 2.0])]

    result = await harness.run()

    assert [p.name for p in result.parameters] == ["LEGACY"]
    assert len(result.warnings) == 1
    assert "Case B/iter-3" in result.warnings[0]
    assert "not stored as a standard result" in result.warnings[0]


async def test_access_non_standard_parameters_warning_is_kept_in_warnings() -> None:
    chain = RestartChain(ancestors=[], unresolved_ensemble_uuid="uuid-deleted", truncated=False)
    harness = _AccessHarness({("case-a", "pred"): [CHILD_TABLE]}, chain)
    harness.detect_warning = "missing from the ERT-managed parameter set"

    result = await harness.run()

    assert len(result.warnings) == 2
    assert result.warnings[-1] == "missing from the ERT-managed parameter set"
