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
        return Math.min(11, Math.round((height / (120 * numPlotsY)) * 11));
    }
    return Math.min(11, Math.round((width / (120 * numPlotsX)) * 11));
}
