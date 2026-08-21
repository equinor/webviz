import type React from "react";

import { useAtomValue } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { InplaceVolumesStatisticalTableData } from "@modules/_shared/InplaceVolumes/types";

import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    comparisonEnsembleIdentAtom,
    indexColumnsLeftUnfilteredAtom,
    indexColumnsWithNoSelectedValuesAtom,
    isIndexValueIntersectionActiveAtom,
    referenceEnsembleIdentAtom,
    resultNameAtom,
    subplotByAtom,
    waterfallFactorSpecAtom,
} from "../atoms/baseAtoms";
import {
    isWaterfallComputableAtom,
    waterfallSourcesAtom,
    waterfallStatisticalDataQueriesAtom,
} from "../atoms/queryAtoms";
import { buildWaterfallPlot, type WaterfallGroupDecomposition } from "../utils/buildWaterfallPlot";
import {
    computeVolumeChangeDecomposition,
    getRequiredFluidForWaterfallTarget,
    isWaterfallTargetResultName,
} from "../utils/computeVolumeChangeDecomposition";
import { findTableDataForSource, makeSourceLabels } from "../utils/waterfallSources";

export type WaterfallMessage = {
    text: string;
    /** "info" for an incomplete selection the user still has to finish, "error" for a real failure. */
    severity: "info" | "error";
};

export interface WaterfallResult {
    plots: React.ReactNode | null;
    isFetching: boolean;
    /** User-facing message when the waterfall cannot be shown. */
    message: WaterfallMessage | null;
    /** Non-blocking notes shown alongside a rendered plot. */
    warnings: string[];
    /** The plotted decompositions, for rendering the same numbers as a table. */
    groups: WaterfallGroupDecomposition[];
    endpointLabels: { referenceLabel: string; comparisonLabel: string } | null;
}

function makeInfoResult(text: string): WaterfallResult {
    return {
        plots: null,
        isFetching: false,
        message: { text, severity: "info" },
        warnings: [],
        groups: [],
        endpointLabels: null,
    };
}

function makeErrorResult(text: string): WaterfallResult {
    return {
        plots: null,
        isFetching: false,
        message: { text, severity: "error" },
        warnings: [],
        groups: [],
        endpointLabels: null,
    };
}

function makePendingResult(isFetching: boolean): WaterfallResult {
    return { plots: null, isFetching, message: null, warnings: [], groups: [], endpointLabels: null };
}

const SINGLE_GROUP_KEY = "__single__";

/** Number of group labels listed before the rest are elided. */
const MAX_LISTED_SKIPPED_GROUPS = 5;

type GroupStatistics = {
    means: Map<string, number>;
    /** Uncertainty band of the target volume, or null when the percentiles are unavailable. */
    targetBand: { low: number; high: number } | null;
};

function formatGroupList(groupLabels: string[]): string {
    const listed = groupLabels.slice(0, MAX_LISTED_SKIPPED_GROUPS).join(", ");
    return groupLabels.length > MAX_LISTED_SKIPPED_GROUPS ? `${listed}, ...` : listed;
}

function makeSkippedGroupsWarning(skippedGroupLabels: string[]): string | null {
    if (skippedGroupLabels.length === 0) {
        return null;
    }
    return `Could not decompose ${skippedGroupLabels.length} of the selected groups (${formatGroupList(skippedGroupLabels)}). They are omitted from the plot.`;
}

/**
 * A group present on only one side has no reference to measure the change from, so its change cannot
 * be split into multiplicative factor contributions and it is dropped rather than plotted.
 */
function makeSingleSidedGroupsWarning(
    referenceOnlyGroupLabels: string[],
    comparisonOnlyGroupLabels: string[],
): string | null {
    if (referenceOnlyGroupLabels.length === 0 && comparisonOnlyGroupLabels.length === 0) {
        return null;
    }
    const parts: string[] = [];
    if (comparisonOnlyGroupLabels.length > 0) {
        parts.push(`only in the comparison (${formatGroupList(comparisonOnlyGroupLabels)})`);
    }
    if (referenceOnlyGroupLabels.length > 0) {
        parts.push(`only in the reference (${formatGroupList(referenceOnlyGroupLabels)})`);
    }
    return `No subplot is shown for groups present ${parts.join(" or ")}, since a change from or to nothing cannot be decomposed into factor contributions.`;
}

/**
 * Extract per-ensemble statistics for the required result names, grouped by the given subplot index
 * column (e.g. one entry per REGION value). When no group-by index is given, all rows collapse to a
 * single group. Returns null when the required fluid is absent, lacks any of the required results,
 * or does not carry the requested group-by column.
 */
function extractRequiredStatisticsByGroup(
    statisticalTableData: InplaceVolumesStatisticalTableData,
    requiredResultNames: string[],
    targetResultName: string,
    requiredFluid: string,
    groupByIndexColumn: string | null,
): Map<string, GroupStatistics> | null {
    // The target dictates the fluid: STOIIP decomposes oil, GIIP gas.
    const fluidTableData = statisticalTableData.data.tableDataPerFluidSelection.find(
        (tableData) => tableData.fluidSelection === requiredFluid,
    );
    if (!fluidTableData) {
        return null;
    }

    const meanArraysByResultName = new Map<string, number[]>();
    let targetP10Array: number[] | undefined;
    let targetP90Array: number[] | undefined;
    for (const resultColumn of fluidTableData.resultColumnStatistics) {
        const meanArray = resultColumn.statisticValues[InplaceVolumesStatistic_api.MEAN];
        if (meanArray) {
            meanArraysByResultName.set(resultColumn.columnName, meanArray);
        }
        if (resultColumn.columnName === targetResultName) {
            targetP10Array = resultColumn.statisticValues[InplaceVolumesStatistic_api.P10];
            targetP90Array = resultColumn.statisticValues[InplaceVolumesStatistic_api.P90];
        }
    }

    if (!requiredResultNames.every((resultName) => meanArraysByResultName.has(resultName))) {
        return null;
    }

    const groupColumn = groupByIndexColumn
        ? fluidTableData.selectorColumns.find((column) => column.columnName === groupByIndexColumn)
        : undefined;

    // Without the requested column every row would collapse onto one key and overwrite the last.
    if (groupByIndexColumn && !groupColumn) {
        return null;
    }

    const numRows = meanArraysByResultName.get(requiredResultNames[0])!.length;
    const statisticsByGroup = new Map<string, GroupStatistics>();
    for (let row = 0; row < numRows; row++) {
        const groupKey =
            groupColumn !== undefined ? String(groupColumn.uniqueValues[groupColumn.indices[row]]) : SINGLE_GROUP_KEY;
        const means = new Map<string, number>();
        for (const resultName of requiredResultNames) {
            means.set(resultName, meanArraysByResultName.get(resultName)![row]);
        }

        // The backend inverts the percentiles per oil industry convention: P10 is the high
        // value and P90 the low. Min/max guards against that convention ever changing.
        const p10 = targetP10Array?.[row];
        const p90 = targetP90Array?.[row];
        const targetBand =
            p10 !== undefined && p90 !== undefined ? { low: Math.min(p10, p90), high: Math.max(p10, p90) } : null;

        statisticsByGroup.set(groupKey, { means, targetBand });
    }
    return statisticsByGroup;
}

/**
 * Build the volume-change waterfall plot for the selected ensemble pair, or a user-facing message
 * explaining why it cannot be shown.
 */
export function useBuildWaterfallPlot(ensembleSet: EnsembleSet, width: number, height: number): WaterfallResult {
    const referenceEnsembleIdent = useAtomValue(referenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = useAtomValue(comparisonEnsembleIdentAtom);
    const resultName = useAtomValue(resultNameAtom);
    const spec = useAtomValue(waterfallFactorSpecAtom);
    const areSourcesDistinct = useAtomValue(areSourcesDistinctAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const isComputable = useAtomValue(isWaterfallComputableAtom);
    const statisticalDataQueries = useAtomValue(waterfallStatisticalDataQueriesAtom);
    const subplotByIndex = useAtomValue(subplotByAtom);
    const waterfallSources = useAtomValue(waterfallSourcesAtom);
    const indexColumnsLeftUnfiltered = useAtomValue(indexColumnsLeftUnfilteredAtom);
    const isIndexValueIntersectionActive = useAtomValue(isIndexValueIntersectionActiveAtom);
    const indexColumnsWithNoSelectedValues = useAtomValue(indexColumnsWithNoSelectedValuesAtom);

    if (!referenceEnsembleIdent || !comparisonEnsembleIdent) {
        return makeInfoResult("Select a reference and a comparison ensemble.");
    }
    if (!waterfallSources) {
        return makeInfoResult("Select a table source for both ensembles.");
    }
    if (!areSourcesDistinct) {
        return makeInfoResult("The reference and comparison must differ in either ensemble or table source.");
    }
    if (!areSelectedTablesComparable) {
        return makeErrorResult(
            "The selected tables are not comparable: they have no result names or index columns in common.",
        );
    }
    if (indexColumnsWithNoSelectedValues.length > 0) {
        return makeInfoResult(
            `Select at least one value for ${indexColumnsWithNoSelectedValues.join(", ")}. No data is included otherwise.`,
        );
    }
    if (!isWaterfallTargetResultName(resultName)) {
        return makeErrorResult("Neither STOIIP nor GIIP is available for the selected tables.");
    }
    if (!spec) {
        return makeErrorResult(
            "The volume columns the decomposition is built from (BULK, PORV, HCPV) are not available for the selected table.",
        );
    }
    if (!isComputable) {
        return makePendingResult(false);
    }

    if (statisticalDataQueries.isFetching) {
        return makePendingResult(true);
    }

    const requiredFluid = getRequiredFluidForWaterfallTarget(spec.target);
    const noDataMessage = `No ${requiredFluid} data available for the ${spec.target} decomposition in the selected tables.`;

    const comparisonTableData = findTableDataForSource(statisticalDataQueries.tablesData, waterfallSources.comparison);
    const referenceTableData = findTableDataForSource(statisticalDataQueries.tablesData, waterfallSources.reference);

    if (!comparisonTableData || !referenceTableData) {
        if (statisticalDataQueries.errors.length > 0) {
            return makeErrorResult("Failed to load inplace volumes table data.");
        }
        return makeErrorResult(noDataMessage);
    }

    const comparisonStatisticsByGroup = extractRequiredStatisticsByGroup(
        comparisonTableData,
        spec.requiredResultNames,
        spec.target,
        requiredFluid,
        subplotByIndex,
    );
    const referenceStatisticsByGroup = extractRequiredStatisticsByGroup(
        referenceTableData,
        spec.requiredResultNames,
        spec.target,
        requiredFluid,
        subplotByIndex,
    );

    if (!comparisonStatisticsByGroup || !referenceStatisticsByGroup) {
        return makeErrorResult(noDataMessage);
    }

    // Compute a decomposition per group present in both ensembles.
    const groupKeys = Array.from(comparisonStatisticsByGroup.keys())
        .filter((groupKey) => referenceStatisticsByGroup.has(groupKey))
        .sort((a, b) => a.localeCompare(b));

    const comparisonOnlyGroupLabels = Array.from(comparisonStatisticsByGroup.keys())
        .filter((groupKey) => groupKey !== SINGLE_GROUP_KEY && !referenceStatisticsByGroup.has(groupKey))
        .sort((a, b) => a.localeCompare(b));
    const referenceOnlyGroupLabels = Array.from(referenceStatisticsByGroup.keys())
        .filter((groupKey) => groupKey !== SINGLE_GROUP_KEY && !comparisonStatisticsByGroup.has(groupKey))
        .sort((a, b) => a.localeCompare(b));

    const groupDecompositions: WaterfallGroupDecomposition[] = [];
    const skippedGroupLabels: string[] = [];
    for (const groupKey of groupKeys) {
        const referenceStatistics = referenceStatisticsByGroup.get(groupKey)!;
        const comparisonStatistics = comparisonStatisticsByGroup.get(groupKey)!;
        const decomposition = computeVolumeChangeDecomposition(
            spec,
            referenceStatistics.means,
            comparisonStatistics.means,
        );
        if (!decomposition) {
            // The ungrouped sentinel is never user-facing: a failed single group ends in the empty check below.
            if (groupKey !== SINGLE_GROUP_KEY) {
                skippedGroupLabels.push(groupKey);
            }
            continue;
        }
        groupDecompositions.push({
            groupLabel: groupKey === SINGLE_GROUP_KEY ? "" : groupKey,
            decomposition,
            uncertainty:
                referenceStatistics.targetBand && comparisonStatistics.targetBand
                    ? {
                          reference: referenceStatistics.targetBand,
                          comparison: comparisonStatistics.targetBand,
                      }
                    : null,
        });
    }

    if (groupDecompositions.length === 0) {
        return makeErrorResult("The waterfall could not be computed for the selected data.");
    }

    const { referenceLabel, comparisonLabel } = makeSourceLabels(
        {
            ensembleName: makeDistinguishableEnsembleDisplayName(
                referenceEnsembleIdent,
                ensembleSet.getRegularEnsembleArray(),
            ),
            tableName: waterfallSources.reference.tableName,
        },
        {
            ensembleName: makeDistinguishableEnsembleDisplayName(
                comparisonEnsembleIdent,
                ensembleSet.getRegularEnsembleArray(),
            ),
            tableName: waterfallSources.comparison.tableName,
        },
    );
    const title = `${spec.target} change contributions from ${referenceLabel} to ${comparisonLabel}`;

    const plots = buildWaterfallPlot(groupDecompositions, {
        height,
        width,
        title,
        referenceLabel,
        comparisonLabel,
    });

    const warnings = [
        isIndexValueIntersectionActive
            ? "Only index values present in both sources are included, so the volumes shown are for that shared subset and do not match the full-field volumes."
            : null,
        indexColumnsLeftUnfiltered.length > 0
            ? `The sources offer different values for ${indexColumnsLeftUnfiltered.join(", ")}. Both are compared unfiltered, so the difference in coverage is part of the BULK contribution.`
            : null,
        makeSingleSidedGroupsWarning(referenceOnlyGroupLabels, comparisonOnlyGroupLabels),
        makeSkippedGroupsWarning(skippedGroupLabels),
    ].filter((warning): warning is string => warning !== null);

    return {
        plots,
        isFetching: false,
        message: null,
        warnings,
        groups: groupDecompositions,
        endpointLabels: { referenceLabel, comparisonLabel },
    };
}
