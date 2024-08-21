/**
 * Util method to do an immutable item move in an array
 * @param array The array to move items in
 * @param from The index of the first item being moved
 * @param to The index the item(s) should be moved to
 * @param moveAmt The amount of items (from the start-index) that should be moved
 * @returns A copy of the original array, with it's items moved accordingly
 */
export function arrayMove<t>(array: t[], from: number, to: number, moveAmt = 1): t[] {
    const newArrray = [...array];
    const movedItems = newArrray.splice(from, moveAmt);

    return newArrray.toSpliced(to, 0, ...movedItems);
}
