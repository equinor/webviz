export const calculateLowBase = (low: number, high: number): number => {
    if (low < 0) {
        return Math.min(0, high);
    }
    return low;
};

export const calculateHighBase = (low: number, high: number): number => {
    if (high > 0) {
        return Math.max(0, low);
    }
    return high;
};

export const calculateHighX = (low: number, high: number): number => {
    if (high > 0) {
        return high - Math.max(0, low);
    }
    return 0.0;
};

export const calculateLowX = (low: number, high: number): number => {
    if (low < 0) {
        return low - Math.min(0, high);
    }
    return 0.0;
};

export const calculateLowXAbsolute = (low: number, ref: number): number => low - ref;

export const calculateHighXAbsolute = (high: number, ref: number): number => high - ref;

export const calculateXaxisRange = (
    lowValues: number[],
    highValues: number[],
    lowRealizationValues: number[][],
    highRealizationValues: number[][],
    isAbsolute: boolean,
    referenceAverage: number,
): [number, number] => {
    let minVal = isAbsolute ? referenceAverage : 0;
    let maxVal = isAbsolute ? referenceAverage : 0;

    // Calculate min/max based on bar chart values
    for (const val of [...lowValues, ...highValues]) {
        minVal = Math.min(minVal, val);
        maxVal = Math.max(maxVal, val);
    }

    // Include realization values in the min/max calculation
    for (const values of [...lowRealizationValues, ...highRealizationValues]) {
        for (const value of values) {
            minVal = Math.min(minVal, value);
            maxVal = Math.max(maxVal, value);
        }
    }

    // Add a buffer for better visualization
    const buffer = (maxVal - minVal) * 0.1;
    return [minVal - buffer, maxVal + buffer];
};