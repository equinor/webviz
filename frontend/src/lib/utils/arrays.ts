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

/**
 * Sort an array of strings according to a specified order, with values not in the order list sorted alphabetically at the end.
 *
 * @param values List of values to sort
 * @param valuesByOrder A list of values defining the desired order. Values not in this list will be sorted alphabetically after the ordered values.
 * @returns Returns a new array with the values sorted according to the specified order.
 */
export function sortStringArray(values: string[], valuesByOrder: string[]): string[] {
    // Build quick lookup for order indices to avoid repeated indexOf
    const orderIndex = new Map(valuesByOrder.map((value, idx) => [value, idx]));

    return values.sort((a, b) => {
        const ia = orderIndex.has(a) ? orderIndex.get(a)! : -1;
        const ib = orderIndex.has(b) ? orderIndex.get(b)! : -1;

        if (ia !== -1 && ib !== -1) return ia - ib; // both in order list
        if (ia !== -1) return -1; // only a in order
        if (ib !== -1) return 1; // only b in order

        return a.localeCompare(b); // neither in order list
    });
}
