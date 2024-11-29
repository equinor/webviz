/**
 * Util method for moving items in an array, by index number. Does not mutate the original array.
 * @param array The array to move items in
 * @param from The index of the first item being moved
 * @param to The index the item(s) should be moved to
 * @param moveAmt The amount of items (from the start-index) that should be moved
 * @returns A shallow copy of the original array, with its items moved accordingly
 */
export function arrayMove<T>(array: T[], from: number, to: number, moveAmt = 1): T[] {
    const newArrray = [...array];
    const movedItems = newArrray.splice(from, moveAmt);

    return newArrray.toSpliced(to, 0, ...movedItems);
}
