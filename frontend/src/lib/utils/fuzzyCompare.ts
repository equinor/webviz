export function fuzzyCompare(a: number, b: number, epsilon: number): boolean {
    return Math.abs(a - b) < epsilon;
}

export function fuzzyCompareArrays(arrayA: number[], arrayB: number[], epsilon: number): boolean {
    if (!arrayA || !arrayB || arrayA.length !== arrayB.length) {
        return false;
    }
    for (let i = 0; i < arrayA.length; i++) {
        if (!fuzzyCompare(arrayA[i], arrayB[i], epsilon)) {
            return false;
        }
    }
    return true;
}
