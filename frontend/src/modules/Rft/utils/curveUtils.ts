export function sortCurveByDepth(depths: number[], values: number[]): { depths: number[]; values: number[] } {
    if (depths.length !== values.length) {
        throw new Error(
            `Cannot sort RFT curve: depths and values must have the same length (got ${depths.length} and ${values.length}).`,
        );
    }
    const orderedIndices = depths.map((_, index) => index).sort((left, right) => depths[left] - depths[right]);
    return {
        depths: orderedIndices.map((index) => depths[index]),
        values: orderedIndices.map((index) => values[index]),
    };
}

export function interpolateValueAtDepth(sortedDepths: number[], sortedValues: number[], targetDepth: number): number {
    if (sortedDepths.length === 0) {
        return Number.NaN;
    }
    if (targetDepth < sortedDepths[0] || targetDepth > sortedDepths[sortedDepths.length - 1]) {
        return Number.NaN;
    }

    for (let index = 0; index < sortedDepths.length - 1; index++) {
        const lowerDepth = sortedDepths[index];
        const upperDepth = sortedDepths[index + 1];
        if (targetDepth >= lowerDepth && targetDepth <= upperDepth) {
            if (upperDepth === lowerDepth) {
                return sortedValues[index];
            }
            const fraction = (targetDepth - lowerDepth) / (upperDepth - lowerDepth);
            return sortedValues[index] + fraction * (sortedValues[index + 1] - sortedValues[index]);
        }
    }

    return sortedValues[sortedDepths.length - 1];
}
