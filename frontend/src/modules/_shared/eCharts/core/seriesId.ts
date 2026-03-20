const SEPARATOR = "|";
const EXPECTED_PART_COUNT = 5;

export interface SeriesIdFields {
    chartType: string;
    role: string;
    name: string;
    subKey: string;
    axisIndex: number;
}

export function makeSeriesId(fields: SeriesIdFields): string {
    return [
        fields.chartType,
        fields.role,
        fields.name,
        fields.subKey,
        String(fields.axisIndex),
    ].join(SEPARATOR);
}

export function parseSeriesId(id: string): SeriesIdFields | null {
    const parts = id.split(SEPARATOR);
    if (parts.length < EXPECTED_PART_COUNT) return null;

    const axisIndex = Number(parts[4]);
    if (!Number.isFinite(axisIndex)) return null;

    return {
        chartType: parts[0],
        role: parts[1],
        name: parts[2],
        subKey: parts[3],
        axisIndex,
    };
}
