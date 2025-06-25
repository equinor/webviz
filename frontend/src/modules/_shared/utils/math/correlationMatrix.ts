import { pearsonCorrelation } from "./pearsonCorrelation";

export type CorrelationDataItem = {
    name: string;
    values: number[];
};

export type CorrelationMatrix = {
    xLabels: string[];
    yLabels: string[];
    matrix: (number | null)[][];
};
export function createPearsonCorrelationMatrix(dataItems: CorrelationDataItem[]): CorrelationMatrix {
    const labels = dataItems.map((item) => item.name);
    const matrix: (number | null)[][] = Array(dataItems.length)
        .fill(null)
        .map(() => Array(dataItems.length).fill(null));

    for (let i = 0; i < dataItems.length; i++) {
        for (let j = i; j < dataItems.length; j++) {
            const item1 = dataItems[i];
            const item2 = dataItems[j];

            const correlation = pearsonCorrelation(item1.values, item2.values);
            matrix[i][j] = correlation;
            matrix[j][i] = correlation;
        }
    }

    return { xLabels: labels, yLabels: labels, matrix };
}
