import { SensitivityType } from "@framework/EnsembleSensitivities";
import { hasCaseOnSide } from "@modules/_shared/SensitivityProcessing";
import type { SensitivityResponse, SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing";

export type SensitivityTableRow = {
    key: string;
    response: string;
    sensitivity: string;
    type: "Distribution" | "Scenario";
    mean: number | null;
    p90: number | null;
    p10: number | null;
    avgLow: number | null;
    avgHigh: number | null;
    totalReals: number | null;
    realsLow: number | null;
    realsHigh: number | null;
};

function makeRow(responseName: string, response: SensitivityResponse): SensitivityTableRow {
    const base = {
        key: `${responseName}-${response.sensitivityName}`,
        response: responseName,
        sensitivity: response.sensitivityName,
    };

    if (response.sensitivityType === SensitivityType.MONTECARLO) {
        return {
            ...base,
            type: "Distribution",
            mean: response.sensitivityAverage ?? null,
            p90: response.lowCaseAverage,
            p10: response.highCaseAverage,
            avgLow: null,
            avgHigh: null,
            totalReals: response.lowCaseRealizationValues.length + response.highCaseRealizationValues.length,
            realsLow: null,
            realsHigh: null,
        };
    }

    const hasLow = hasCaseOnSide(response, "low");
    const hasHigh = hasCaseOnSide(response, "high");
    return {
        ...base,
        type: "Scenario",
        mean: null,
        p90: null,
        p10: null,
        avgLow: hasLow ? response.lowCaseAverage : null,
        avgHigh: hasHigh ? response.highCaseAverage : null,
        totalReals: null,
        realsLow: hasLow ? response.lowCaseRealizationValues.length : null,
        realsHigh: hasHigh ? response.highCaseRealizationValues.length : null,
    };
}

/** Rows for every response, each listed from the largest to the smallest impact. */
export function makeSensitivityTableRows(datasets: SensitivityResponseDataset[]): SensitivityTableRow[] {
    return datasets.flatMap((dataset) => {
        const responseName = dataset.responseName ?? "";
        return dataset.sensitivityResponses
            .slice()
            .reverse()
            .map((response) => makeRow(responseName, response));
    });
}

/** Sorts by one column; rows without a value in that column go last in both directions. */
export function sortSensitivityTableRows(
    rows: SensitivityTableRow[],
    columnKey: keyof SensitivityTableRow,
    direction: "asc" | "desc",
): SensitivityTableRow[] {
    const withValue = rows.filter((row) => row[columnKey] !== null);
    const withoutValue = rows.filter((row) => row[columnKey] === null);
    const sign = direction === "asc" ? 1 : -1;
    const sorted = withValue.toSorted((a, b) => {
        const left = a[columnKey]!;
        const right = b[columnKey]!;
        if (typeof left === "number" && typeof right === "number") {
            return sign * (left - right);
        }
        return sign * String(left).localeCompare(String(right));
    });
    return [...sorted, ...withoutValue];
}
