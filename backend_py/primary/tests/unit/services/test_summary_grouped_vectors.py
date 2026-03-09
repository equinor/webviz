import polars as pl
import pytest

from webviz_services.summary_grouped_vectors import (
    GroupedVectorEntry,
    GroupedVectorsResult,
    VectorGroup,
    compute_grouped_vector_sums,
)


def _make_df(
    dates: list[int],
    reals: list[int],
    vectors: dict[str, list[float]],
) -> pl.DataFrame:
    """Helper to build a DataFrame with DATE (datetime ms), REAL, and vector columns."""
    data: dict[str, list[int] | list[float] | pl.Series] = {
        "DATE": pl.Series(dates).cast(pl.Datetime("ms")),
        "REAL": reals,
        **vectors,
    }
    return pl.DataFrame(data)


# ---------------------------------------------------------------------------
# Basic summation
# ---------------------------------------------------------------------------


def test_single_group_single_vector() -> None:
    df = _make_df(
        dates=[1000, 2000, 1000, 2000],
        reals=[0, 0, 1, 1],
        vectors={"A": [1.0, 2.0, 3.0, 4.0]},
    )
    groups = [VectorGroup(group_label="grp", vector_names=["A"])]

    result = compute_grouped_vector_sums(df, groups)

    assert result.realizations == [0, 1]
    assert result.timestamps_utc_ms == [1000, 2000]
    assert len(result.groups) == 1
    assert result.groups[0].group_label == "grp"
    assert result.groups[0].values_per_realization == [[1.0, 2.0], [3.0, 4.0]]


def test_single_group_multiple_vectors_summed() -> None:
    df = _make_df(
        dates=[1000, 2000, 1000, 2000],
        reals=[0, 0, 1, 1],
        vectors={
            "A": [1.0, 2.0, 3.0, 4.0],
            "B": [10.0, 20.0, 30.0, 40.0],
        },
    )
    groups = [VectorGroup(group_label="sum_AB", vector_names=["A", "B"])]

    result = compute_grouped_vector_sums(df, groups)

    assert result.groups[0].values_per_realization == [[11.0, 22.0], [33.0, 44.0]]


def test_multiple_groups() -> None:
    df = _make_df(
        dates=[100, 200, 100, 200],
        reals=[0, 0, 1, 1],
        vectors={
            "X": [1.0, 2.0, 5.0, 6.0],
            "Y": [10.0, 20.0, 50.0, 60.0],
        },
    )
    groups = [
        VectorGroup(group_label="only_X", vector_names=["X"]),
        VectorGroup(group_label="XY", vector_names=["X", "Y"]),
    ]

    result = compute_grouped_vector_sums(df, groups)

    assert len(result.groups) == 2
    labels = {g.group_label for g in result.groups}
    assert labels == {"only_X", "XY"}

    only_x = next(g for g in result.groups if g.group_label == "only_X")
    assert only_x.values_per_realization == [[1.0, 2.0], [5.0, 6.0]]

    xy = next(g for g in result.groups if g.group_label == "XY")
    assert xy.values_per_realization == [[11.0, 22.0], [55.0, 66.0]]


# ---------------------------------------------------------------------------
# Filtering / edge-case groups
# ---------------------------------------------------------------------------


def test_all_zero_group_is_omitted() -> None:
    df = _make_df(
        dates=[1000, 2000, 1000, 2000],
        reals=[0, 0, 1, 1],
        vectors={
            "A": [1.0, 2.0, 3.0, 4.0],
            "Z": [0.0, 0.0, 0.0, 0.0],
        },
    )
    groups = [
        VectorGroup(group_label="nonzero", vector_names=["A"]),
        VectorGroup(group_label="zero", vector_names=["Z"]),
    ]

    result = compute_grouped_vector_sums(df, groups)

    assert len(result.groups) == 1
    assert result.groups[0].group_label == "nonzero"


def test_missing_vectors_group_is_omitted() -> None:
    df = _make_df(
        dates=[1000, 2000],
        reals=[0, 0],
        vectors={"A": [1.0, 2.0]},
    )
    groups = [
        VectorGroup(group_label="exists", vector_names=["A"]),
        VectorGroup(group_label="missing", vector_names=["X", "Y"]),
    ]

    result = compute_grouped_vector_sums(df, groups)

    assert len(result.groups) == 1
    assert result.groups[0].group_label == "exists"


def test_partially_missing_vectors_uses_available() -> None:
    """If a group requests ['A', 'MISSING'], only 'A' is summed."""
    df = _make_df(
        dates=[1000, 2000],
        reals=[0, 0],
        vectors={"A": [5.0, 10.0]},
    )
    groups = [VectorGroup(group_label="partial", vector_names=["A", "MISSING"])]

    result = compute_grouped_vector_sums(df, groups)

    assert len(result.groups) == 1
    assert result.groups[0].values_per_realization == [[5.0, 10.0]]


# ---------------------------------------------------------------------------
# Realization / timestamp structure
# ---------------------------------------------------------------------------


def test_single_realization() -> None:
    df = _make_df(
        dates=[100, 200, 300],
        reals=[0, 0, 0],
        vectors={"V": [1.0, 2.0, 3.0]},
    )
    groups = [VectorGroup(group_label="g", vector_names=["V"])]

    result = compute_grouped_vector_sums(df, groups)

    assert result.realizations == [0]
    assert result.timestamps_utc_ms == [100, 200, 300]
    assert result.groups[0].values_per_realization == [[1.0, 2.0, 3.0]]


def test_many_realizations() -> None:
    n_reals = 5
    n_times = 3
    dates = list(range(1000, 1000 + n_times)) * n_reals
    reals = [r for r in range(n_reals) for _ in range(n_times)]
    vals = [float(r * 10 + t) for r in range(n_reals) for t in range(n_times)]

    df = _make_df(dates=dates, reals=reals, vectors={"V": vals})
    groups = [VectorGroup(group_label="g", vector_names=["V"])]

    result = compute_grouped_vector_sums(df, groups)

    assert result.realizations == list(range(n_reals))
    assert len(result.groups[0].values_per_realization) == n_reals


def test_unsorted_input_is_handled() -> None:
    """DataFrame rows not sorted by REAL/DATE should still produce correct results."""
    df = _make_df(
        dates=[2000, 1000, 2000, 1000],
        reals=[1, 0, 0, 1],
        vectors={"A": [40.0, 10.0, 20.0, 30.0]},
    )
    groups = [VectorGroup(group_label="g", vector_names=["A"])]

    result = compute_grouped_vector_sums(df, groups)

    assert result.realizations == [0, 1]
    assert result.timestamps_utc_ms == [1000, 2000]
    r0 = result.groups[0].values_per_realization[0]
    r1 = result.groups[0].values_per_realization[1]
    assert r0 == [10.0, 20.0]
    assert r1 == [30.0, 40.0]


# ---------------------------------------------------------------------------
# Return type structure
# ---------------------------------------------------------------------------


def test_return_types() -> None:
    df = _make_df(
        dates=[1000, 2000],
        reals=[0, 0],
        vectors={"A": [1.0, 2.0]},
    )
    groups = [VectorGroup(group_label="g", vector_names=["A"])]

    result = compute_grouped_vector_sums(df, groups)

    assert isinstance(result, GroupedVectorsResult)
    assert isinstance(result.realizations, list)
    assert isinstance(result.timestamps_utc_ms, list)
    assert isinstance(result.groups[0], GroupedVectorEntry)
    assert isinstance(result.groups[0].values_per_realization, list)
    assert isinstance(result.groups[0].values_per_realization[0], list)


def test_empty_groups_list() -> None:
    df = _make_df(
        dates=[1000, 2000],
        reals=[0, 0],
        vectors={"A": [1.0, 2.0]},
    )

    result = compute_grouped_vector_sums(df, [])

    assert result.realizations == [0]
    assert result.timestamps_utc_ms == [1000, 2000]
    assert result.groups == []
