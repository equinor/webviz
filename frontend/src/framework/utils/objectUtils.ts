/**
 * Check number of boolean values equal to true in object of string keys and boolean values
 *
 * Returns number of true values in object
 */
export function countTrueValues(obj: { [key: string]: boolean }): number {
    return Object.values(obj).filter((value) => value).length;
}
