export function createTimestampMarkLine(dateLabel: string): Record<string, unknown> {
    return {
        silent: true,
        symbol: "none",
        animation: false,
        lineStyle: { type: "solid", color: "#333", width: 1.5 },
        label: {
            show: true,
            formatter: dateLabel,
            position: "insideEndTop",
            fontSize: 10,
            color: "#333",
        },
        data: [{ xAxis: dateLabel }],
    };
}

/**
 * Add a vertical marker line at the active timestamp on the first eligible
 * series of each grid. Skips fanchart custom series. Mutates the series array.
 */
export function applyActiveTimestampMarker(allSeries: any[], activeDate: string): void {
    const seenGrids = new Set<number>();
    for (const s of allSeries) {
        const gridIdx: number = s.xAxisIndex ?? 0;
        if (seenGrids.has(gridIdx)) continue;
        if (typeof s.name === "string" && s.name.includes("_fan_")) continue;
        seenGrids.add(gridIdx);
        s.markLine = createTimestampMarkLine(activeDate);
    }
}
