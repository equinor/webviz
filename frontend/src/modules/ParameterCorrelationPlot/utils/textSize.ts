export function calcTextSize({
    width,
    height,
    numPlotsX,
    numPlotsY,
}: {
    width: number;
    height: number;
    numPlotsX: number;
    numPlotsY: number;
}): number {
    if (width > height) {
        return Math.min(12, Math.max(9, Math.round((height / (120 * numPlotsY)) * 9)));
    }
    return Math.min(12, Math.max(9, Math.round((width / (120 * numPlotsX)) * 9)));
}
