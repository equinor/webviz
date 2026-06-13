/** Unit separator — chosen because it cannot appear in user-visible trace names. */
const SEPARATOR = "\x1F";
const EXPECTED_PART_COUNT = 5;

export interface SeriesIdFields {
    chartType: string;
    role: string;
    name: string;
    subKey: string;
    axisIndex: number;
}

/**
 * Encodes structured chart metadata into a single opaque series ID string.
 * The ID is used by tooltip formatters and interaction hooks to recover
 * which chart type, role, trace name, and subplot a series belongs to.
 */
export function makeSeriesId(fields: SeriesIdFields): string {
    return [
        fields.chartType,
        fields.role,
        fields.name,
        fields.subKey,
        String(fields.axisIndex),
    ].join(SEPARATOR);
}

/** Inverse of `makeSeriesId`. Returns null when the id format is unrecognized. */
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
