/**
 * Checks if values are constant (all the same value).
 */
export function isConstant(values: number[]): boolean {
    if (values.length === 0) {
        return true;
    }
    const firstValue = values[0];
    return values.every((v) => v === firstValue);
}
