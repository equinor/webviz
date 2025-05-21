/**
 * Create color scale values for grid data from value range
 */
export function createGridColorScaleValues(valueRange: readonly [number, number]): {
    min: number;
    max: number;
    mid: number;
} {
    const min = valueRange[0];
    const max = valueRange[1];
    const mid = min + (max - min) / 2;
    return { min, max, mid };
}

/**
 * Create color scale values for seismic data from value range
 *
 * Seismic color scale should be symmetric around 0, so we calculate the min and max values
 */
export function createSeismicColorScaleValues(valueRange: readonly [number, number]): {
    min: number;
    max: number;
    mid: number;
} {
    const min = Math.min(0.0, valueRange[0]);
    const max = Math.max(0.0, valueRange[1]);
    const mid = 0;

    // Seismic data should be symmetric around 0
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    const symmetricMax = absMax;
    const symmetricMin = -absMax;

    return { min: symmetricMin, max: symmetricMax, mid };
}
