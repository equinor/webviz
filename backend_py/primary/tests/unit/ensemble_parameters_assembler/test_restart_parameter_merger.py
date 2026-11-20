from typing import Any

import pytest

from webviz_services.ensemble_parameters_assembler._restart_parameter_merger import merge_restart_parameters
from webviz_services.service_exceptions import InvalidDataError
from webviz_services.sumo_access.ensemble_lineage import ResolvedEnsemble
from webviz_services.sumo_access.parameter_types import EnsembleParameter, ParameterSourceEnsemble

CHILD_LABEL = "Case A/pred"
PARENT = ResolvedEnsemble(ensemble_uuid="uuid-iter3", case_uuid="case-b", case_name="Case B", ensemble_name="iter-3")
GRANDPARENT = ResolvedEnsemble(
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


def _source(ancestor: ResolvedEnsemble) -> ParameterSourceEnsemble:
    return ParameterSourceEnsemble(
        case_uuid=ancestor.case_uuid, case_name=ancestor.case_name, ensemble_name=ancestor.ensemble_name
    )


def test_merge_without_ancestors_is_identity() -> None:
    own = [_param("A", [1.0, 2.0]), _param("B", [3.0, 4.0])]

    merged, warnings = merge_restart_parameters(own, [], CHILD_LABEL)

    assert merged == own
    assert not warnings


def test_merge_disjoint_names_sets_source_ensemble_and_keeps_own_first() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("FWL", [10.0, 20.0], group_name="GLOBVAR")]

    merged, warnings = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["A", "FWL"]
    assert merged[0].source_ensemble is None
    assert merged[1].source_ensemble == _source(PARENT)
    assert merged[1].group_name == "GLOBVAR"
    assert merged[1].values == [10.0, 20.0]
    assert not warnings


def test_merge_same_name_different_group_is_allowed() -> None:
    own = [_param("FWL", [1.0, 2.0], group_name="GROUP1")]
    parent_params = [_param("FWL", [10.0, 20.0], group_name="GROUP2")]

    merged, _ = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [(p.name, p.group_name) for p in merged] == [("FWL", "GROUP1"), ("FWL", "GROUP2")]


def test_merge_same_name_and_group_raises_naming_ensembles_and_parameters() -> None:
    own = [_param("FWL", [1.0, 2.0], group_name="GLOBVAR"), _param("KVKH", [1.0, 2.0], group_name="GLOBVAR")]
    parent_params = [_param("FWL", [1.0, 2.0], group_name="GLOBVAR"), _param("KVKH", [1.0, 2.0], group_name="GLOBVAR")]

    with pytest.raises(InvalidDataError) as exc_info:
        merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    message = str(exc_info.value)
    assert "GLOBVAR/FWL" in message
    assert "GLOBVAR/KVKH" in message
    assert CHILD_LABEL in message
    assert "Case B/iter-3" in message


def test_merge_ungrouped_conflict_raises() -> None:
    own = [_param("MULT", [1.0, 2.0])]
    parent_params = [_param("MULT", [1.0, 2.0])]

    with pytest.raises(InvalidDataError, match="MULT"):
        merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_conflict_between_two_ancestors_raises() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("X", [1.0, 2.0])]
    grandparent_params = [_param("X", [1.0, 2.0])]

    with pytest.raises(InvalidDataError) as exc_info:
        merge_restart_parameters(own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL)

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

    merged, warnings = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["SENSNAME", "SENSCASE", "A", "B"]
    assert all(p.source_ensemble is None for p in merged[:3])
    assert merged[3].source_ensemble == _source(PARENT)
    assert not warnings


def test_merge_sensitivity_parameter_in_child_only_raises() -> None:
    own = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("B", [3.0, 4.0])]

    with pytest.raises(InvalidDataError, match=r"SENSCASE is missing in Case B/iter-3"):
        merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_sensitivity_parameters_in_parent_only_raises() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]

    with pytest.raises(InvalidDataError) as exc_info:
        merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    message = str(exc_info.value)
    assert f"SENSNAME is missing in {CHILD_LABEL}" in message
    assert f"SENSCASE is missing in {CHILD_LABEL}" in message


def test_merge_sensitivity_values_differing_on_one_realization_raises() -> None:
    own = [_param("SENSNAME", ["s1", "s1", "s2"]), _param("SENSCASE", ["c1", "c1", "c2"])]
    parent_params = [_param("SENSNAME", ["s1", "s1", "s1"]), _param("SENSCASE", ["c1", "c1", "c2"])]

    with pytest.raises(InvalidDataError, match=r"SENSNAME differs on 1 realization\(s\)"):
        merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)


def test_merge_sensitivity_alignment_only_compares_child_realizations() -> None:
    own = [_param("SENSNAME", ["s1", "s1"], [0, 1]), _param("SENSCASE", ["c1", "c1"], [0, 1])]
    parent_params = [
        _param("SENSNAME", ["s1", "s1", "other"], [0, 1, 2]),
        _param("SENSCASE", ["c1", "c1", "other"], [0, 1, 2]),
    ]

    merged, warnings = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert [p.name for p in merged] == ["SENSNAME", "SENSCASE"]
    assert not warnings


def test_merge_filters_ancestor_to_child_realizations_and_recomputes_is_constant() -> None:
    own = [_param("A", [1.0, 2.0], [1, 3])]
    parent_param = _param("B", [5.0, 7.0, 5.0, 9.0], [0, 1, 2, 3])
    parent_param_constant_after_filter = _param("C", [1.0, 2.0, 3.0, 2.0], [0, 1, 2, 3])
    assert parent_param_constant_after_filter.is_constant is False

    merged, warnings = merge_restart_parameters(
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
    assert not warnings


def test_merge_child_realization_missing_in_parent_gives_warning() -> None:
    own = [_param("A", [1.0, 2.0, 3.0], [0, 1, 5])]
    parent_params = [_param("B", [10.0, 20.0], [0, 1])]

    merged, warnings = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert merged[1].realizations == [0, 1]
    assert len(warnings) == 1
    assert "Case B/iter-3" in warnings[0]
    assert "5" in warnings[0]


def test_merge_two_level_chain_orders_nearest_first() -> None:
    own = [_param("A", [1.0, 2.0])]
    parent_params = [_param("B", [3.0, 4.0])]
    grandparent_params = [_param("C", [5.0, 6.0]), _param("D", [7.0, 8.0])]

    merged, warnings = merge_restart_parameters(
        own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL
    )

    assert [p.name for p in merged] == ["A", "B", "C", "D"]
    assert [p.source_ensemble for p in merged] == [None, _source(PARENT), _source(GRANDPARENT), _source(GRANDPARENT)]
    assert not warnings


def test_merge_two_level_chain_checks_sensitivities_against_every_ancestor() -> None:
    own = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    parent_params = [_param("SENSNAME", ["s1", "s1"]), _param("SENSCASE", ["c1", "c1"])]
    grandparent_params = [_param("B", [3.0, 4.0])]

    with pytest.raises(InvalidDataError, match="Case B/iter-2"):
        merge_restart_parameters(own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL)


def test_merge_skips_ancestor_sharing_no_realizations_with_warning() -> None:
    own = [_param("A", [1.0, 2.0], [0, 1])]
    parent_params = [_param("B", [1.0, 1.0], [5, 6])]
    grandparent_params = [_param("C", [3.0, 4.0], [0, 1])]

    merged, warnings = merge_restart_parameters(
        own, [(PARENT, parent_params), (GRANDPARENT, grandparent_params)], CHILD_LABEL
    )

    assert [(p.name, p.source_ensemble) for p in merged] == [("A", None), ("C", _source(GRANDPARENT))]
    assert warnings == [
        f"Restart ensemble Case B/iter-3 shares no realizations with {CHILD_LABEL}; its parameters were not combined."
    ]


def test_merge_does_not_check_conflicts_or_sensitivities_against_skipped_ancestor() -> None:
    own = [
        _param("SENSNAME", ["s1", "s1"], [0, 1]),
        _param("SENSCASE", ["c1", "c1"], [0, 1]),
        _param("A", [1.0, 2.0], [0, 1]),
    ]
    parent_params = [_param("A", [1.0, 2.0], [5, 6])]

    merged, warnings = merge_restart_parameters(own, [(PARENT, parent_params)], CHILD_LABEL)

    assert merged == own
    assert len(warnings) == 1
    assert "shares no realizations" in warnings[0]
