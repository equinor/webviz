import { SensitivityType } from "@framework/EnsembleSensitivities";
import type { SensitivityResponse } from "@modules/_shared/SensitivityProcessing";
import { formatWithLargeValuePrefixes } from "@modules/_shared/utils/numberFormatting";

function formatSigned(value: number): string {
    const formatted = formatWithLargeValuePrefixes(value);
    return value > 0 ? `+${formatted}` : formatted;
}

type CaseSummary = { name: string; value: number; difference: number; percentage: string; numRealizations: number };

/** Null for the empty side of a single-case scenario, which sits at the reference. */
function summarizeCase(
    response: SensitivityResponse,
    side: "low" | "high",
    referenceAverage: number,
): CaseSummary | null {
    const isLow = side === "low";
    const name = isLow ? response.lowCaseName : response.highCaseName;
    if (name === "" && (isLow ? response.lowCaseRealizations : response.highCaseRealizations).length === 0) {
        return null;
    }
    const value = isLow ? response.lowCaseAverage : response.highCaseAverage;
    const difference = value - referenceAverage;
    const percentage =
        referenceAverage !== 0
            ? `${difference > 0 ? "+" : ""}${((difference / referenceAverage) * 100).toFixed(1)}%`
            : "";
    const numRealizations =
        response.sensitivityType === SensitivityType.MONTECARLO
            ? response.lowCaseRealizationValues.length + response.highCaseRealizationValues.length
            : (isLow ? response.lowCaseRealizationValues : response.highCaseRealizationValues).length;
    return { name, value, difference, percentage, numRealizations };
}

function formatCaseLine(summary: CaseSummary): string {
    const percentage = summary.percentage ? ` (${summary.percentage})` : "";
    return `${summary.name}: ${formatWithLargeValuePrefixes(summary.value)}, ${formatSigned(summary.difference)}${percentage} vs reference, ${summary.numRealizations} reals`;
}

/** Plotly hovertemplate for one tornado bar: which case it is, its value and its difference from the reference. */
export function makeTornadoBarHoverTemplate(
    response: SensitivityResponse,
    side: "low" | "high",
    referenceAverage: number,
): string {
    const low = summarizeCase(response, "low", referenceAverage);
    const high = summarizeCase(response, "high", referenceAverage);

    // Both cases on one side: a single bar spans from one case to the other, so it describes both.
    if (low && high && low.difference !== 0 && Math.sign(low.difference) === Math.sign(high.difference)) {
        const direction = low.difference > 0 ? "above" : "below";
        return (
            [
                `<b>${response.sensitivityName}</b>`,
                `Both cases ${direction} the reference; the bar spans between them`,
                formatCaseLine(low),
                formatCaseLine(high),
            ].join("<br>") + "<extra></extra>"
        );
    }

    const summary = side === "low" ? low : high;
    if (!summary) {
        return `<b>${response.sensitivityName}</b><br>No ${side} case<extra></extra>`;
    }

    const isDistribution = response.sensitivityType === SensitivityType.MONTECARLO;
    const percentage = summary.percentage ? ` (${summary.percentage})` : "";
    return (
        [
            `<b>${response.sensitivityName}</b> · ${summary.name}`,
            `${isDistribution ? summary.name : "Average"}: ${formatWithLargeValuePrefixes(summary.value)}`,
            `vs reference: ${formatSigned(summary.difference)}${percentage}`,
            `Realizations: ${summary.numRealizations}`,
        ].join("<br>") + "<extra></extra>"
    );
}
