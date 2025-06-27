import { pearsonCorrelation } from "./pearsonCorrelation";

export type CorrelationDataItem = {
    name: string;
    values: number[];
    realizations: number[];
};

/**
 * Creates a correlation matrix for the given data items
 * The correlation is calculated using Pearson's method.
 * The resulting matrix is symmetric, with the correlation of each item with itself being 1.
 * The matrix is represented as an object with xLabels and yLabels for the axes, and a 2D array for the correlation values.
 */
export type CorrelationMatrix = {
    xLabels: string[];
    yLabels: string[];
    matrix: (number | null)[][];
};

export function createPearsonCorrelationMatrix(
    dataItems: CorrelationDataItem[],
    correlationCutoff: number | null = null,
): CorrelationMatrix {
    const labels = dataItems.map((item) => item.name);
    const matrix: (number | null)[][] = Array(dataItems.length)
        .fill(null)
        .map(() => Array(dataItems.length).fill(null));

    for (let i = 0; i < dataItems.length; i++) {
        for (let j = i; j < dataItems.length; j++) {
            const item1 = dataItems[i];
            const item2 = dataItems[j];

            let correlation: number | null;

            if (i === j) {
                correlation = 1;
            } else {
                const [alignedValues1, alignedValues2] = alignCorrelationItemsValuesByRealizations(item1, item2);
                if (alignedValues1.length >= 2 && alignedValues2.length >= 2) {
                    correlation = pearsonCorrelation(alignedValues1, alignedValues2);
                } else {
                    correlation = null;
                }
            }
            // apply cell cutoff
            if (
                correlationCutoff !== null &&
                correlation !== null &&
                i !== j &&
                Math.abs(correlation) < correlationCutoff
            ) {
                matrix[i][j] = null;
                matrix[j][i] = null;
            } else {
                matrix[i][j] = correlation;
                matrix[j][i] = correlation;
            }
        }
    }

    return { xLabels: labels, yLabels: labels, matrix };
}
/**
 * Aligns two sets of values based on their corresponding realization numbers.
 * Only includes values for realizations present in both sets.
 */
export function alignCorrelationItemsValuesByRealizations(
    item1: CorrelationDataItem,
    item2: CorrelationDataItem,
): [number[], number[]] {
    const firstItemMap = new Map<number, number>();
    for (let i = 0; i < item1.realizations.length; i++) {
        firstItemMap.set(item1.realizations[i], item1.values[i]);
    }

    const alignedValues1: number[] = [];
    const alignedValues2: number[] = [];

    // Iterate through item2's realizations and find matches in item1
    for (let i = 0; i < item2.realizations.length; i++) {
        const currentRealization = item2.realizations[i];
        if (firstItemMap.has(currentRealization)) {
            alignedValues1.push(firstItemMap.get(currentRealization)!); // Add value from item1
            alignedValues2.push(item2.values[i]); // Add corresponding value from item2
        }
    }

    return [alignedValues1, alignedValues2];
}

/**
 * Filters the correlation matrix based on thresholds for rows and columns.
 * If a row has any correlation above the rowThreshold, it is kept.
 * If a column has any correlation above the colThreshold, it is kept.
 *
 */
export function filterCorrelationMatrixByRowAndColumnThresholds(
    originalMatrix: CorrelationMatrix,
    rowThreshold: number | null = null,
    colThreshold: number | null = null,
): CorrelationMatrix {
    const { xLabels, yLabels, matrix } = originalMatrix;

    // Find rows above the threshold
    const rowsToKeep: boolean[] = Array(matrix.length).fill(true);
    if (rowThreshold !== null) {
        for (let i = 0; i < matrix.length; i++) {
            let keepRow = false;
            for (let j = 0; j < matrix[i].length; j++) {
                // Ignore self-correlation (diagonal elements) for filtering
                const isSelfCorrelation = i === j;
                if (!isSelfCorrelation && matrix[i][j] !== null && Math.abs(matrix[i][j] as number) >= rowThreshold) {
                    keepRow = true;
                    break; // If a single significant correlation is found, keep the row
                }
            }
            rowsToKeep[i] = keepRow;
        }
    }

    // Find columns above the threshold
    const colsToKeep: boolean[] = Array(xLabels.length).fill(true);
    if (colThreshold !== null) {
        for (let j = 0; j < xLabels.length; j++) {
            let keepCol = false;
            for (let i = 0; i < matrix.length; i++) {
                // Only consider cells from rows that are already marked to be kept
                if (rowsToKeep[i]) {
                    // Ignore self-correlation (diagonal elements) for filtering
                    const isSelfCorrelation = i === j;
                    if (
                        !isSelfCorrelation &&
                        matrix[i][j] !== null &&
                        Math.abs(matrix[i][j] as number) >= colThreshold
                    ) {
                        keepCol = true;
                        break;
                    }
                }
            }
            colsToKeep[j] = keepCol;
        }
    }

    // Create new matrix and labels based on the rows and columns to keep
    const newMatrix: (number | null)[][] = [];
    const newYLabels: string[] = [];
    const newXLabels: string[] = [];

    for (let i = 0; i < yLabels.length; i++) {
        if (rowsToKeep[i]) {
            newYLabels.push(yLabels[i]);
        }
    }

    for (let j = 0; j < xLabels.length; j++) {
        if (colsToKeep[j]) {
            newXLabels.push(xLabels[j]);
        }
    }

    for (let i = 0; i < matrix.length; i++) {
        if (rowsToKeep[i]) {
            const newRow: (number | null)[] = [];
            for (let j = 0; j < matrix[i].length; j++) {
                if (colsToKeep[j]) {
                    newRow.push(matrix[i][j]);
                }
            }
            newMatrix.push(newRow);
        }
    }

    return {
        xLabels: newXLabels,
        yLabels: newYLabels,
        matrix: newMatrix,
    };
}
