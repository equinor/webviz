import type React from "react";

import { useAtomValue } from "jotai";

import { InplaceVolumesStatistic_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { InplaceVolumesStatisticalTableData } from "@modules/_shared/InplaceVolumes/types";

import {
    areSelectedTablesComparableAtom,
    comparisonEnsembleIdentAtom,
    referenceEnsembleIdentAtom,
    resultNameAtom,
    subplotByAtom,
    tableNameAtom,
    waterfallFactorSpecAtom,
} from "../atoms/baseAtoms";
import { isWaterfallComputableAtom, waterfallStatisticalDataQueriesAtom } from "../atoms/queryAtoms";
import { buildWaterfallPlot, type WaterfallGroupDecomposition } from "../utils/buildWaterfallPlot";
import {
    computeVolumeChangeDecomposition,
    getRequiredFluidForWaterfallTarget,
    isWaterfallTargetResultName,
} from "../utils/computeVolumeChangeDecomposition";

export interface WaterfallResult {
    plots: React.ReactNode | null;
    isFetching: boolean;
    /** User-facing message when the waterfall cannot be shown. */
    message: string | null;
}

const SINGLE_GROUP_KEY = "__single__";

type GroupStatistics = {
    means: Map<string, number>;
    /** Uncertainty band of the target volume, or null when the percentiles are unavailable. */
    targetBand: { low: number; high: number } | null;
};

/**
 * Extract per-ensemble statistics for the required result names, grouped by the given subplot index
 * column (e.g. one entry per REGION value). When no group-by index is given, all rows collapse to a
 * single group. Returns null when no fluid selection has the complete set of required results.
 */
function extractRequiredStatisticsByGroup(
    statisticalTableData: InplaceVolumesStatisticalTableData,
    requiredResultNames: string[],
    targetResultName: string,
    groupByIndexColumn: string | null,
): Map<string, GroupStatistics> | null {
    for (const fluidTableData of statisticalTableData.data.tableDataPerFluidSelection) {
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

        // Only use the fluid selection that has all required results.
        if (!requiredResultNames.every((resultName) => meanArraysByResultName.has(resultName))) {
            continue;
        }

        const groupColumn = groupByIndexColumn
            ? fluidTableData.selectorColumns.find((column) => column.columnName === groupByIndexColumn)
            : undefined;

        const numRows = meanArraysByResultName.get(requiredResultNames[0])!.length;
        const statisticsByGroup = new Map<string, GroupStatistics>();
        for (let row = 0; row < numRows; row++) {
            const groupKey =
                groupColumn !== undefined
                    ? String(groupColumn.uniqueValues[groupColumn.indices[row]])
                    : SINGLE_GROUP_KEY;
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
    return null;
}

/**
 * Build the volume-change waterfall plot for the selected ensemble pair, or a user-facing message
 * explaining why it cannot be shown.
 */
export function useBuildWaterfallPlot(ensembleSet: EnsembleSet, width: number, height: number): WaterfallResult {
    const referenceEnsembleIdent = useAtomValue(referenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = useAtomValue(comparisonEnsembleIdentAtom);
    const resultName = useAtomValue(resultNameAtom);
    const tableName = useAtomValue(tableNameAtom);
    const spec = useAtomValue(waterfallFactorSpecAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const isComputable = useAtomValue(isWaterfallComputableAtom);
    const statisticalDataQueries = useAtomValue(waterfallStatisticalDataQueriesAtom);
    const subplotByIndex = useAtomValue(subplotByAtom);

    if (!referenceEnsembleIdent || !comparisonEnsembleIdent) {
        return { plots: null, isFetching: false, message: "Select a reference and a comparison ensemble." };
    }
    if (referenceEnsembleIdent.equals(comparisonEnsembleIdent)) {
        return {
            plots: null,
            isFetching: false,
            message: "The reference and comparison ensembles must be different.",
        };
    }
    if (!tableName) {
        return { plots: null, isFetching: false, message: "Select a table source." };
    }
    if (!areSelectedTablesComparable) {
        return {
            plots: null,
            isFetching: false,
            message: "The selected tables are not comparable due to mismatching result names or index columns.",
        };
    }
    if (!isWaterfallTargetResultName(resultName)) {
        return {
            plots: null,
            isFetching: false,
            message: "The volume change decomposition is only available for STOIIP or GIIP.",
        };
    }
    if (!spec) {
        return {
            plots: null,
            isFetching: false,
            message:
                "The required factor columns (BULK, PORO or NTG+PORO_NET, SW, BO/BG) are not available for the selected table.",
        };
    }
    if (!isComputable) {
        return { plots: null, isFetching: false, message: null };
    }

    if (statisticalDataQueries.isFetching) {
        return { plots: null, isFetching: true, message: null };
    }

    const requiredFluid = getRequiredFluidForWaterfallTarget(spec.target);
    const noDataMessage = `No data for the ${requiredFluid} fluid required by the ${spec.target} decomposition. Make sure '${requiredFluid}' is selected in the filters.`;

    const comparisonTableData = statisticalDataQueries.tablesData.find((tableData) =>
        tableData.ensembleIdent.equals(comparisonEnsembleIdent),
    );
    const referenceTableData = statisticalDataQueries.tablesData.find((tableData) =>
        tableData.ensembleIdent.equals(referenceEnsembleIdent),
    );

    if (!comparisonTableData || !referenceTableData) {
        return { plots: null, isFetching: false, message: noDataMessage };
    }

    const comparisonStatisticsByGroup = extractRequiredStatisticsByGroup(
        comparisonTableData,
        spec.requiredResultNames,
        spec.target,
        subplotByIndex,
    );
    const referenceStatisticsByGroup = extractRequiredStatisticsByGroup(
        referenceTableData,
        spec.requiredResultNames,
        spec.target,
        subplotByIndex,
    );

    if (!comparisonStatisticsByGroup || !referenceStatisticsByGroup) {
        return { plots: null, isFetching: false, message: noDataMessage };
    }

    // Compute a decomposition per group present in both ensembles.
    const groupKeys = Array.from(comparisonStatisticsByGroup.keys())
        .filter((groupKey) => referenceStatisticsByGroup.has(groupKey))
        .sort((a, b) => a.localeCompare(b));

    const groupDecompositions: WaterfallGroupDecomposition[] = [];
    for (const groupKey of groupKeys) {
        const referenceStatistics = referenceStatisticsByGroup.get(groupKey)!;
        const comparisonStatistics = comparisonStatisticsByGroup.get(groupKey)!;
        const decomposition = computeVolumeChangeDecomposition(
            spec,
            referenceStatistics.means,
            comparisonStatistics.means,
        );
        if (decomposition) {
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
    }

    if (groupDecompositions.length === 0) {
        return {
            plots: null,
            isFetching: false,
            message: "The waterfall decomposition could not be computed for the selected data.",
        };
    }

    const referenceLabel = makeDistinguishableEnsembleDisplayName(
        referenceEnsembleIdent,
        ensembleSet.getRegularEnsembleArray(),
    );
    const comparisonLabel = makeDistinguishableEnsembleDisplayName(
        comparisonEnsembleIdent,
        ensembleSet.getRegularEnsembleArray(),
    );
    const title = `${spec.target} change contributions from ${referenceLabel} to ${comparisonLabel}`;

    const plots = buildWaterfallPlot(groupDecompositions, {
        height,
        width,
        title,
        referenceLabel,
        comparisonLabel,
    });

    return { plots, isFetching: false, message: null };
}
