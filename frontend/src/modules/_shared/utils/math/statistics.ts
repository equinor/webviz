export const computeQuantile = (data: number[], quantile: number): number => {
    // Compute the quantile of a dataset

    if (quantile < 0 || quantile > 1) {
        throw new Error(`Quantile must be between 0 and 1, but got ${quantile}`);
    }
    if (data.length === 0) {
        return 0;
    }
    if (data.length === 1) {
        return data[0];
    }
    const sortedValues = data.sort((a, b) => a - b);

    // Calculate the index, which may be a decimal.
    const rank = (sortedValues.length - 1) * quantile;

    if (Number.isInteger(rank)) {
        // If the index is an integer, no interpolation is needed
        return sortedValues[rank];
    } else {
        // If the index is not an integer, we interpolate between the two nearest values
        const lowerRank = Math.floor(rank);
        const fraction = rank - lowerRank;
        return sortedValues[lowerRank] * (1 - fraction) + sortedValues[lowerRank + 1] * fraction;
    }
};
