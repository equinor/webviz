from dataclasses import dataclass

import polars as pl


@dataclass
class VectorGroup:
    """A named group of vector column names to be summed element-wise."""

    group_label: str
    vector_names: list[str]


@dataclass
class GroupedVectorEntry:
    """Result for one group: group label and summed values per realization."""

    group_label: str
    values_per_realization: list[list[float]]


@dataclass
class GroupedVectorsResult:
    """Result of grouping and summing vectors across realizations.

    ``realizations`` and ``timestamps_utc_ms`` are shared across all groups.
    """

    realizations: list[int]
    timestamps_utc_ms: list[int]
    groups: list[GroupedVectorEntry]


def compute_grouped_vector_sums(
    df: pl.DataFrame,
    groups: list[VectorGroup],
) -> GroupedVectorsResult:
    """Compute element-wise sums of vectors within each group.

    The input *df* must have columns ``DATE``, ``REAL``, and one column per
    requested vector name.  The DataFrame is assumed to have been resampled
    so that every realization shares the same timestamp grid.

    Groups whose vectors are all missing from *df*, or whose summed values
    are all zero, are omitted from the result.
    """
    df_sorted = df.sort(["REAL", "DATE"])
    available_columns = set(df_sorted.columns)

    # Build per-realization aggregated frame once (REAL + list columns)
    agg_df = df_sorted.group_by("REAL", maintain_order=True).agg(pl.all())

    realizations: list[int] = agg_df["REAL"].to_list()
    timestamps_utc_ms: list[int] = agg_df["DATE"][0].cast(int).to_list()

    group_results: list[GroupedVectorEntry] = []

    for group in groups:
        cols = [vn for vn in group.vector_names if vn in available_columns]
        if not cols:
            continue

        if len(cols) == 1:
            summed_df = df_sorted.select("REAL", "DATE", pl.col(cols[0]).alias("_sum"))
        else:
            summed_df = df_sorted.select("REAL", "DATE", pl.sum_horizontal(cols).alias("_sum"))

        # Fast all-zero check before grouping
        if summed_df["_sum"].sum() == 0.0:
            continue

        grouped = summed_df.group_by("REAL", maintain_order=True).agg(pl.col("_sum"))
        values_per_real: list[list[float]] = grouped["_sum"].to_list()

        group_results.append(
            GroupedVectorEntry(
                group_label=group.group_label,
                values_per_realization=values_per_real,
            )
        )

    return GroupedVectorsResult(
        realizations=realizations,
        timestamps_utc_ms=timestamps_utc_ms,
        groups=group_results,
    )
